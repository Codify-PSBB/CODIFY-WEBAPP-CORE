import { createDbClient, type QueryInput } from "../lib/db";
import { readCompetitionState } from "../lib/competition";
import { readJsonBody, RequestBodyTooLargeError } from "../lib/request";
import { getUserId } from "../lib/user";
import type { RouteHandler } from "../types";

const MAX_SUBMISSION_BODY_BYTES = 512 * 1024;
const MAX_ANSWERS = 10;
const MAX_CODE_CHARS = 50_000;

interface ProblemCodePair {
  problem_id: number;
  code: string;
}

interface BulkSubmissionBody {
  competition_id?: unknown;
  answers?: unknown;
}

function parseCode(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > MAX_CODE_CHARS) return null;
  return value;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export const submissionsHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json({ status: "error", message: "Authentication context missing." }, { status: 500 });
  }

  let body: BulkSubmissionBody;
  try {
    body = await readJsonBody<BulkSubmissionBody>(ctx.request, MAX_SUBMISSION_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ status: "error", message: "Submission request is too large." }, { status: 413 });
    }
    return Response.json({ status: "error", message: "Invalid JSON body." }, { status: 400 });
  }

  const competitionId = parsePositiveInt(body.competition_id);
  if (!competitionId) {
    return Response.json({ status: "error", message: "`competition_id` (positive integer) is required." }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > MAX_ANSWERS) {
    return Response.json(
      { status: "error", message: `\`answers\` must contain between 1 and ${MAX_ANSWERS} answers.` },
      { status: 400 }
    );
  }

  const answers: ProblemCodePair[] = [];
  const submittedProblemIds = new Set<number>();
  for (const item of body.answers as unknown[]) {
    if (typeof item !== "object" || item === null) {
      return Response.json({ status: "error", message: "Each answer must contain `problem_id` and `code`." }, { status: 400 });
    }
    const answer = item as Record<string, unknown>;
    const problemId = parsePositiveInt(answer.problem_id);
    const code = parseCode(answer.code);
    if (!problemId || !code) {
      return Response.json(
        { status: "error", message: `Each answer needs a valid problem ID and no more than ${MAX_CODE_CHARS} code characters.` },
        { status: 400 }
      );
    }
    if (submittedProblemIds.has(problemId)) {
      return Response.json({ status: "error", message: "Only one answer per problem is allowed." }, { status: 400 });
    }
    submittedProblemIds.add(problemId);
    answers.push({ problem_id: problemId, code });
  }

  const db = createDbClient(ctx.env.DB);
  try {
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase !== "live" || state.competition_id !== competitionId || !state.started_at) {
      return Response.json({ status: "error", message: "This competition is not currently accepting submissions." }, { status: 409 });
    }

    const validProblems = await db.all<{ problem_id: number }>(
      "SELECT problem_id FROM competition_problems WHERE competition_id = ?",
      [competitionId]
    );
    const validProblemIds = new Set(validProblems.map((problem) => problem.problem_id));
    if (answers.length > validProblemIds.size || answers.some((answer) => !validProblemIds.has(answer.problem_id))) {
      return Response.json({ status: "error", message: "One or more answers do not belong to this competition." }, { status: 422 });
    }

    const startedAtMs = Date.parse(state.started_at);
    if (!Number.isFinite(startedAtMs)) throw new Error("Live competition has an invalid start time.");
    const receivedAt = new Date();
    const elapsedSeconds = Math.max(0, Math.floor((receivedAt.getTime() - startedAtMs) / 1000));
    const userId = await getUserId(ctx.env.DB, ctx.user);

    const queries: QueryInput[] = [
      {
        sql: `INSERT INTO submission_groups (user_id, competition_id, elapsed_seconds, created_at)
              SELECT ?, id, ?, ? FROM competitions WHERE id = ? AND status = 'live' AND reset_at IS NULL`,
        params: [userId, elapsedSeconds, receivedAt.toISOString(), competitionId],
      },
      ...answers.map((answer) => ({
        sql: `INSERT INTO submissions (user_id, problem_id, code, status, competition_id, submission_group_id, created_at)
              VALUES (?, ?, ?, 'pending', ?,
                (SELECT id FROM submission_groups WHERE user_id = ? AND competition_id = ?), ?)`,
        params: [userId, answer.problem_id, answer.code, competitionId, userId, competitionId, receivedAt.toISOString()],
      })),
    ];

    await db.batch(queries);

    const group = await db.first<{ id: number; created_at: string }>(
      "SELECT id, created_at FROM submission_groups WHERE user_id = ? AND competition_id = ?",
      [userId, competitionId]
    );
    const submissions = await db.all<{ id: number }>(
      "SELECT id FROM submissions WHERE submission_group_id = ? ORDER BY id ASC",
      [group?.id ?? -1]
    );

    if (!group || submissions.length !== answers.length) {
      throw new Error("Atomic submission batch returned incomplete results.");
    }

    return Response.json(
      {
        status: "success",
        data: {
          submission_group_id: group.id,
          submission_ids: submissions.map((submission) => submission.id),
          elapsed_seconds: elapsedSeconds,
          submitted_at: group.created_at,
          message: `${submissions.length} answer(s) submitted successfully.`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("submissionsHandler error", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ status: "error", message: "You have already submitted for this competition." }, { status: 409 });
    }
    return Response.json({ status: "error", message: "Failed to save submission." }, { status: 500 });
  }
};
