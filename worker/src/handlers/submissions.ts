import { createDbClient } from "../lib/db";
import { readCompetitionState } from "../lib/competition";
import { getUserId } from "../lib/user";
import type { RouteHandler } from "../types";

interface ProblemCodePair {
  problem_id: number;
  code: string;
}

interface BulkSubmissionBody {
  competition_id?: unknown;
  elapsed_seconds?: unknown;
  answers?: unknown;
}

function parseCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function parseNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

/**
 * POST /api/submissions
 *
 * Body:
 * {
 *   competition_id: number,
 *   elapsed_seconds: number,   // how long the student has been competing (client stopwatch)
 *   answers: [
 *     { problem_id: number, code: string },
 *     ...
 *   ]
 * }
 *
 * Creates a submission_group row (one per student per competition) and individual
 * submission rows for each answer. If the student has already submitted for this
 * competition, returns 409.
 */
export const submissionsHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json({ status: "error", message: "Authentication context missing." }, { status: 500 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: BulkSubmissionBody;
  try {
    body = (await ctx.request.json()) as BulkSubmissionBody;
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON body." }, { status: 400 });
  }

  const competitionId = parsePositiveInt(body.competition_id);
  const elapsedSeconds = parseNonNegativeInt(body.elapsed_seconds) ?? 0;

  if (!competitionId) {
    return Response.json({ status: "error", message: "`competition_id` (positive integer) is required." }, { status: 400 });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return Response.json({ status: "error", message: "`answers` must be a non-empty array of { problem_id, code }." }, { status: 400 });
  }

  // Validate each answer
  const answers: ProblemCodePair[] = [];
  for (const item of body.answers as unknown[]) {
    if (typeof item !== "object" || item === null) {
      return Response.json({ status: "error", message: "Each answer must be an object with `problem_id` and `code`." }, { status: 400 });
    }
    const a = item as Record<string, unknown>;
    const pid = parsePositiveInt(a.problem_id);
    const code = parseCode(a.code);
    if (!pid || !code) {
      return Response.json({ status: "error", message: `Answer entry missing valid problem_id or code.` }, { status: 400 });
    }
    answers.push({ problem_id: pid, code });
  }

  // ── Validate competition state ─────────────────────────────────────────────
  const state = await readCompetitionState(ctx.env.APP_STATE);
  if (state.phase !== "live") {
    return Response.json({ status: "error", message: "No competition is currently live." }, { status: 403 });
  }
  if (state.competition_id !== competitionId) {
    return Response.json({ status: "error", message: "Competition ID does not match the current live competition." }, { status: 409 });
  }

  const db = createDbClient(ctx.env.DB);
  const userId = await getUserId(ctx.env.DB, ctx.user);

  // ── Prevent re-submission ─────────────────────────────────────────────────
  const existing = await db.first<{ id: number }>(
    "SELECT id FROM submission_groups WHERE user_id = ? AND competition_id = ?",
    [userId, competitionId]
  );
  if (existing) {
    return Response.json(
      { status: "error", message: "You have already submitted for this competition." },
      { status: 409 }
    );
  }

  // ── Verify all problem IDs belong to this competition ─────────────────────
  const validProblems = await db.all<{ problem_id: number }>(
    "SELECT problem_id FROM competition_problems WHERE competition_id = ?",
    [competitionId]
  );
  const validProblemIds = new Set(validProblems.map((p) => p.problem_id));
  for (const answer of answers) {
    if (!validProblemIds.has(answer.problem_id)) {
      return Response.json(
        { status: "error", message: `Problem #${answer.problem_id} is not part of this competition.` },
        { status: 422 }
      );
    }
  }

  // ── Insert submission_group (atomic) ──────────────────────────────────────
  const group = await db.first<{ id: number; created_at: string }>(
    "INSERT INTO submission_groups (user_id, competition_id, elapsed_seconds) VALUES (?, ?, ?) RETURNING id, created_at",
    [userId, competitionId, elapsedSeconds]
  );

  if (!group) {
    return Response.json({ status: "error", message: "Failed to create submission record." }, { status: 500 });
  }

  // ── Insert individual submissions ─────────────────────────────────────────
  const submissionIds: number[] = [];
  for (const answer of answers) {
    const sub = await db.first<{ id: number }>(
      `INSERT INTO submissions (user_id, problem_id, code, status, competition_id, submission_group_id)
       VALUES (?, ?, ?, 'pending', ?, ?) RETURNING id`,
      [userId, answer.problem_id, answer.code, competitionId, group.id]
    );
    if (sub) submissionIds.push(sub.id);
  }

  return Response.json(
    {
      status: "success",
      data: {
        submission_group_id: group.id,
        submission_ids: submissionIds,
        elapsed_seconds: elapsedSeconds,
        submitted_at: group.created_at,
        message: `${submissionIds.length} answer(s) submitted successfully.`,
      },
    },
    { status: 201 }
  );
};
