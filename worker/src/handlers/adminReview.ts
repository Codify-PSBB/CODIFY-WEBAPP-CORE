import { createDbClient } from "../lib/db";
import { ensureUserId } from "../lib/user";
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

interface ReviewedSubmissionRow {
  id: number;
  user_id: number;
  problem_id: number;
  status: "pending" | "approved" | "rejected";
  reviewed_by: number | null;
  created_at: string;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function parseAction(value: unknown): ReviewAction | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === "approve" || normalized === "reject") {
    return normalized;
  }

  return null;
}

function changedRows(result: D1Result): number {
  const meta = result.meta as { changes?: number } | undefined;
  return meta?.changes ?? 0;
}

export const adminReviewHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  let body: ReviewRequestBody;
  try {
    body = (await ctx.request.json()) as ReviewRequestBody;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const submissionId = parsePositiveInt(body.submission_id);
  const action = parseAction(body.action);

  if (!submissionId || !action) {
    return Response.json(
      {
        status: "error",
        message: "`submission_id` (positive integer) and `action` (`approve` or `reject`) are required."
      },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);
    const reviewerUserId = await ensureUserId(ctx.env.DB, ctx.user);

    const submission = await db.first<SubmissionWithProblem>(
      `SELECT
        s.id,
        s.status,
        s.user_id,
        s.problem_id,
        p.xp_reward
      FROM submissions s
      INNER JOIN problems p ON p.id = s.problem_id
      WHERE s.id = ?`,
      [submissionId]
    );

    if (!submission) {
      return Response.json(
        {
          status: "error",
          message: "Submission not found."
        },
        { status: 404 }
      );
    }

    if (submission.status !== "pending") {
      return Response.json(
        {
          status: "error",
          message: "Submission is already reviewed."
        },
        { status: 409 }
      );
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";

    const updateSubmissionResult = await db.run(
      "UPDATE submissions SET status = ?, reviewed_by = ? WHERE id = ? AND status = 'pending'",
      [nextStatus, reviewerUserId, submissionId]
    );

    if (changedRows(updateSubmissionResult) === 0) {
      return Response.json(
        {
          status: "error",
          message: "Submission review could not be applied."
        },
        { status: 409 }
      );
    }

    if (action === "approve") {
      await db.run("UPDATE users SET xp = xp + ? WHERE id = ?", [submission.xp_reward, submission.user_id]);
    }

    const reviewed = await db.first<ReviewedSubmissionRow>(
      "SELECT id, user_id, problem_id, status, reviewed_by, created_at FROM submissions WHERE id = ?",
      [submissionId]
    );

    return Response.json({
      status: "success",
      data: {
        submission: reviewed,
        action
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to review submission."
      },
      { status: 500 }
    );
  }
};
