import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

const APP_STATUS_KEY = "app_status";

interface ProblemRow {
  id: number;
  title: string;
  description: string;
  sample_input: string | null;
  sample_output: string | null;
  testcases: string | null;
  xp_reward: number;
  active: number;
  created_at: string;
}

interface CreateProblemRequestBody {
  title?: unknown;
  description?: unknown;
  sample_input?: unknown;
  sample_output?: unknown;
  testcases?: unknown;
  xp_reward?: unknown;
  active?: unknown;
}

interface ProblemActionRequestBody {
  problem_id?: unknown;
}

interface SubmissionCountRow {
  count: number;
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
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

function changedRows(result: D1Result): number {
  const meta = result.meta as { changes?: number } | undefined;
  return meta?.changes ?? 0;
}

function parseActiveFlag(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value === 1 ? 1 : value === 0 ? 0 : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true" || normalized === "on") {
      return 1;
    }

    if (normalized === "0" || normalized === "false" || normalized === "off") {
      return 0;
    }
  }

  return null;
}

export const adminProblemsGetHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const problems = await db.all<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        sample_input,
        sample_output,
        testcases,
        xp_reward,
        active,
        created_at
      FROM problems
      ORDER BY created_at DESC, id DESC`
    );

    return Response.json({
      status: "success",
      data: {
        problems
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to fetch problems for admin dashboard."
      },
      { status: 500 }
    );
  }
};

export const adminProblemsPostHandler: RouteHandler = async (ctx) => {
  let body: CreateProblemRequestBody;

  try {
    body = (await ctx.request.json()) as CreateProblemRequestBody;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const title = parseNonEmptyString(body.title);
  const description = parseNonEmptyString(body.description);
  const xpReward = parseNonNegativeInt(body.xp_reward);
  const active = parseActiveFlag(body.active);

  if (!title || !description || xpReward === null || active === null) {
    return Response.json(
      {
        status: "error",
        message:
          "`title` and `description` are required. `xp_reward` must be a non-negative integer. `active` must be true/false (or 1/0) when provided."
      },
      { status: 400 }
    );
  }

  const sampleInput = parseOptionalString(body.sample_input);
  const sampleOutput = parseOptionalString(body.sample_output);
  const testcases = parseOptionalString(body.testcases);

  try {
    const db = createDbClient(ctx.env.DB);

    // Enforce a single live competition question at a time.
    if (active === 1) {
      await db.run("UPDATE problems SET active = 0 WHERE active = 1");
    }

    await db.run(
      `INSERT INTO problems (title, description, sample_input, sample_output, testcases, xp_reward, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, sampleInput, sampleOutput, testcases, xpReward, active]
    );

    const created = await db.first<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        sample_input,
        sample_output,
        testcases,
        xp_reward,
        active,
        created_at
      FROM problems
      WHERE id = last_insert_rowid()`
    );

    return Response.json(
      {
        status: "success",
        data: {
          problem: created,
          message:
            active === 1
              ? "Competition question posted and set as active. Any previous active question was archived."
              : "Competition question saved as archived/inactive."
        }
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to create problem."
      },
      { status: 500 }
    );
  }
};

export const adminProblemsArchiveHandler: RouteHandler = async (ctx) => {
  let body: ProblemActionRequestBody;

  try {
    body = (await ctx.request.json()) as ProblemActionRequestBody;
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
  if (!problemId) {
    return Response.json(
      {
        status: "error",
        message: "`problem_id` must be a positive integer."
      },
      { status: 400 }
    );
  }

  try {
    const currentStatus = (await ctx.env.APP_STATE.get(APP_STATUS_KEY))?.trim().toUpperCase() ?? "ON";
    if (currentStatus === "ON") {
      return Response.json(
        {
          status: "error",
          message: "Competition is ON. Turn it OFF before archiving a problem."
        },
        { status: 409 }
      );
    }

    const db = createDbClient(ctx.env.DB);

    const result = await db.run("UPDATE problems SET active = 0 WHERE id = ?", [problemId]);
    if (changedRows(result) === 0) {
      return Response.json(
        {
          status: "error",
          message: "Problem not found."
        },
        { status: 404 }
      );
    }

    const problem = await db.first<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        sample_input,
        sample_output,
        testcases,
        xp_reward,
        active,
        created_at
      FROM problems
      WHERE id = ?`,
      [problemId]
    );

    return Response.json({
      status: "success",
      data: {
        problem,
        message: `Problem #${problemId} archived.`
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to archive problem."
      },
      { status: 500 }
    );
  }
};

export const adminProblemsDeleteHandler: RouteHandler = async (ctx) => {
  let body: ProblemActionRequestBody;

  try {
    body = (await ctx.request.json()) as ProblemActionRequestBody;
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
  if (!problemId) {
    return Response.json(
      {
        status: "error",
        message: "`problem_id` must be a positive integer."
      },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);

    const problem = await db.first<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        sample_input,
        sample_output,
        testcases,
        xp_reward,
        active,
        created_at
      FROM problems
      WHERE id = ?`,
      [problemId]
    );

    if (!problem) {
      return Response.json(
        {
          status: "error",
          message: "Problem not found."
        },
        { status: 404 }
      );
    }

    const submissionCount = await db.first<SubmissionCountRow>(
      "SELECT COUNT(*) AS count FROM submissions WHERE problem_id = ?",
      [problemId]
    );

    if ((submissionCount?.count ?? 0) > 0) {
      return Response.json(
        {
          status: "error",
          message: "Problem has submissions and cannot be deleted. Archive it instead."
        },
        { status: 409 }
      );
    }

    const result = await db.run("DELETE FROM problems WHERE id = ?", [problemId]);
    if (changedRows(result) === 0) {
      return Response.json(
        {
          status: "error",
          message: "Problem not found."
        },
        { status: 404 }
      );
    }

    return Response.json({
      status: "success",
      data: {
        deleted_problem_id: problemId,
        message: `Problem #${problemId} deleted.`
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to delete problem."
      },
      { status: 500 }
    );
  }
};
