import { createDbClient } from "../lib/db";
import { readJsonBody } from "../lib/request";
import { getUserId } from "../lib/user";
import type { RouteHandler } from "../types";

type ReviewAction = "approve" | "reject";

interface ReviewRequestBody {
  submission_id?: unknown;
  action?: unknown;
}

interface SubmissionWithProblem {
  id: number;
  status: "pending" | "approved" | "rejected";
  user_id: number;
  problem_id: number;
  xp_reward: number;
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseAction(value: unknown): ReviewAction | null {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return normalized === "approve" || normalized === "reject" ? normalized : null;
}

export const adminReviewHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json({ status: "error", message: "Authentication context missing." }, { status: 500 });
  }

  let body: ReviewRequestBody;
  try {
    body = await readJsonBody<ReviewRequestBody>(ctx.request, 16 * 1024);
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON body." }, { status: 400 });
  }

  const submissionId = parsePositiveInt(body.submission_id);
  const action = parseAction(body.action);
  if (!submissionId || !action) {
    return Response.json(
      { status: "error", message: "`submission_id` and `action` (`approve` or `reject`) are required." },
      { status: 400 }
    );
  }

  const db = createDbClient(ctx.env.DB);
  try {
    const reviewerUserId = await getUserId(ctx.env.DB, ctx.user);
    const submission = await db.first<SubmissionWithProblem>(
      `SELECT s.id, s.status, s.user_id, s.problem_id, p.xp_reward
       FROM submissions s JOIN problems p ON p.id = s.problem_id
       WHERE s.id = ?`,
      [submissionId]
    );

    if (!submission) {
      return Response.json({ status: "error", message: "Submission not found." }, { status: 404 });
    }
    if (submission.status !== "pending") {
      return Response.json({ status: "error", message: "Submission is already reviewed." }, { status: 409 });
    }

    if (action === "reject") {
      await db.run(
        "UPDATE submissions SET status = 'rejected', reviewed_by = ? WHERE id = ? AND status = 'pending'",
        [reviewerUserId, submissionId]
      );
    } else {
      // Every statement is one D1 transaction. The award is inserted only when
      // this reviewer won the pending->approved transition; changes() then gates XP.
      await db.batch([
        {
          sql: "UPDATE submissions SET status = 'approved', reviewed_by = ? WHERE id = ? AND status = 'pending'",
          params: [reviewerUserId, submissionId],
        },
        {
          sql: `INSERT INTO xp_awards (user_id, problem_id, submission_id, xp_awarded)
                SELECT ?, ?, ?, ?
                FROM submissions
                WHERE id = ? AND status = 'approved' AND reviewed_by = ?
                ON CONFLICT(user_id, problem_id) DO NOTHING`,
          params: [submission.user_id, submission.problem_id, submissionId, submission.xp_reward, submissionId, reviewerUserId],
        },
        {
          sql: "UPDATE users SET xp = xp + ? WHERE id = ? AND changes() = 1",
          params: [submission.xp_reward, submission.user_id],
        },
      ]);
    }

    const reviewed = await db.first<{
      id: number;
      user_id: number;
      problem_id: number;
      status: "pending" | "approved" | "rejected";
      reviewed_by: number | null;
      created_at: string;
    }>("SELECT id, user_id, problem_id, status, reviewed_by, created_at FROM submissions WHERE id = ?", [submissionId]);

    const expectedStatus = action === "approve" ? "approved" : "rejected";
    if (!reviewed || reviewed.status !== expectedStatus || reviewed.reviewed_by !== reviewerUserId) {
      return Response.json({ status: "error", message: "Submission is already reviewed." }, { status: 409 });
    }
    return Response.json({ status: "success", data: { submission: reviewed, action } });
  } catch (error) {
    console.error("adminReviewHandler error", error);
    return Response.json({ status: "error", message: "Failed to review submission." }, { status: 500 });
  }
};
