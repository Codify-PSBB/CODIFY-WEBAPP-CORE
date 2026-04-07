import { createDbClient } from "../lib/db";
import { ensureUserId } from "../lib/user";
import type { RouteHandler } from "../types";

interface SubmissionRequestBody {
  problem_id?: unknown;
  code?: unknown;
}

interface ProblemRow {
  id: number;
}

interface InsertedSubmissionRow {
  id: number;
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

function parseCode(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
}

export const submissionsHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  let body: SubmissionRequestBody;
  try {
    body = (await ctx.request.json()) as SubmissionRequestBody;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const problemId = parsePositiveInt(body.problem_id);
  const code = parseCode(body.code);

  if (!problemId || !code) {
    return Response.json(
      {
        status: "error",
        message: "`problem_id` (positive integer) and `code` (non-empty string) are required."
      },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);
    const userId = await ensureUserId(ctx.env.DB, ctx.user);

    const problem = await db.first<ProblemRow>("SELECT id FROM problems WHERE id = ? AND active = 1", [problemId]);
    if (!problem) {
      return Response.json(
        {
          status: "error",
          message: "Problem not found or inactive."
        },
        { status: 404 }
      );
    }

    await db.run(
      "INSERT INTO submissions (user_id, problem_id, code, status, created_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)",
      [userId, problemId, code]
    );

    const inserted = await db.first<InsertedSubmissionRow>(
      "SELECT id, created_at FROM submissions WHERE id = last_insert_rowid()"
    );

    return Response.json(
      {
        status: "success",
        data: {
          submission: {
            id: inserted?.id ?? null,
            user_id: userId,
            problem_id: problemId,
            status: "pending",
            created_at: inserted?.created_at ?? null
          }
        }
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to create submission."
      },
      { status: 500 }
    );
  }
};

