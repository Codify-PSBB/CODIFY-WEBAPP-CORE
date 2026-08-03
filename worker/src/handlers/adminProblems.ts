import { readCompetitionState } from "../lib/competition";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

const MAX_TITLE_CHARS = 160;
const MAX_DESCRIPTION_CHARS = 20_000;
const MAX_PUBLIC_TESTCASE_CHARS = 10_000;
const MAX_PRIVATE_TESTCASES_CHARS = 100_000;

interface ProblemRow {
  id: number;
  title: string;
  description: string;
  public_testcase_1_input: string | null;
  public_testcase_1_output: string | null;
  public_testcase_2_input: string | null;
  public_testcase_2_output: string | null;
  public_testcase_3_input: string | null;
  public_testcase_3_output: string | null;
  testcases: string | null;
  xp_reward: number;
  active: number;
  created_at: string;
  submission_count?: number;
}

interface CreateProblemRequestBody {
  title?: unknown;
  description?: unknown;
  public_testcase_1_input?: unknown;
  public_testcase_1_output?: unknown;
  public_testcase_2_input?: unknown;
  public_testcase_2_output?: unknown;
  public_testcase_3_input?: unknown;
  public_testcase_3_output?: unknown;
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

function exceedsLimit(value: string | null, maxChars: number): boolean {
  return value !== null && value.length > maxChars;
}

function validateProblemSizes(fields: {
  title: string;
  description: string;
  publicTestcases: Array<string | null>;
  testcases: string | null;
}): string | null {
  if (fields.title.length > MAX_TITLE_CHARS) return `Title cannot exceed ${MAX_TITLE_CHARS} characters.`;
  if (fields.description.length > MAX_DESCRIPTION_CHARS) return `Description cannot exceed ${MAX_DESCRIPTION_CHARS} characters.`;
  if (fields.publicTestcases.some((value) => exceedsLimit(value, MAX_PUBLIC_TESTCASE_CHARS))) {
    return `Each public testcase input/output cannot exceed ${MAX_PUBLIC_TESTCASE_CHARS} characters.`;
  }
  if (exceedsLimit(fields.testcases, MAX_PRIVATE_TESTCASES_CHARS)) {
    return `Private testcases cannot exceed ${MAX_PRIVATE_TESTCASES_CHARS} characters.`;
  }
  return null;
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

function isLiveCompetitionMutationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("live competition problem");
}

function liveCompetitionMutationResponse(): Response {
  return Response.json(
    { status: "error", message: "End the live competition before changing this problem." },
    { status: 409 }
  );
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
        p.id,
        p.title,
        p.description,
        p.public_testcase_1_input,
        p.public_testcase_1_output,
        p.public_testcase_2_input,
        p.public_testcase_2_output,
        p.public_testcase_3_input,
        p.public_testcase_3_output,
        p.testcases,
        p.xp_reward,
        p.active,
        p.created_at,
        COUNT(s.id) as submission_count
      FROM problems p
      LEFT JOIN submissions s ON s.problem_id = p.id
      GROUP BY p.id, p.title, p.description, p.public_testcase_1_input, p.public_testcase_1_output,
               p.public_testcase_2_input, p.public_testcase_2_output, p.public_testcase_3_input,
               p.public_testcase_3_output, p.testcases, p.xp_reward, p.active, p.created_at
      ORDER BY p.created_at DESC, p.id DESC`
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

  const publicTestcase1Input = parseOptionalString(body.public_testcase_1_input);
  const publicTestcase1Output = parseOptionalString(body.public_testcase_1_output);
  const publicTestcase2Input = parseOptionalString(body.public_testcase_2_input);
  const publicTestcase2Output = parseOptionalString(body.public_testcase_2_output);
  const publicTestcase3Input = parseOptionalString(body.public_testcase_3_input);
  const publicTestcase3Output = parseOptionalString(body.public_testcase_3_output);
  const testcases = parseOptionalString(body.testcases);
  const sizeError = validateProblemSizes({
    title,
    description,
    publicTestcases: [
      publicTestcase1Input, publicTestcase1Output,
      publicTestcase2Input, publicTestcase2Output,
      publicTestcase3Input, publicTestcase3Output,
    ],
    testcases,
  });
  if (sizeError) {
    return Response.json({ status: "error", message: sizeError }, { status: 413 });
  }

  try {
    const db = createDbClient(ctx.env.DB);

    // Enforce a single live competition question at a time.
    if (active === 1) {
      await db.run("UPDATE problems SET active = 0 WHERE active = 1");
    }

    await db.run(
      `INSERT INTO problems (title, description, public_testcase_1_input, public_testcase_1_output, public_testcase_2_input, public_testcase_2_output, public_testcase_3_input, public_testcase_3_output, testcases, xp_reward, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, publicTestcase1Input, publicTestcase1Output, publicTestcase2Input, publicTestcase2Output, publicTestcase3Input, publicTestcase3Output, testcases, xpReward, active]
    );

    const created = await db.first<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        public_testcase_1_input,
        public_testcase_1_output,
        public_testcase_2_input,
        public_testcase_2_output,
        public_testcase_3_input,
        public_testcase_3_output,
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
  } catch (error) {
    if (isLiveCompetitionMutationError(error)) return liveCompetitionMutationResponse();
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
    const state = await readCompetitionState(ctx.env.DB);
    if (state.phase === "live") {
      return Response.json(
        { status: "error", message: "End the live competition before archiving a problem." },
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
        public_testcase_1_input,
        public_testcase_1_output,
        public_testcase_2_input,
        public_testcase_2_output,
        public_testcase_3_input,
        public_testcase_3_output,
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
  } catch (error) {
    if (isLiveCompetitionMutationError(error)) return liveCompetitionMutationResponse();
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
        public_testcase_1_input,
        public_testcase_1_output,
        public_testcase_2_input,
        public_testcase_2_output,
        public_testcase_3_input,
        public_testcase_3_output,
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

    console.log(`Delete attempt for problem ${problemId}: submission count = ${submissionCount?.count ?? 0}`);

    if ((submissionCount?.count ?? 0) > 0) {
      return Response.json(
        {
          status: "error",
          message: `Problem has ${submissionCount?.count ?? 0} submissions and cannot be deleted. Archive it instead.`
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
  } catch (error) {
    if (isLiveCompetitionMutationError(error)) return liveCompetitionMutationResponse();
    return Response.json(
      {
        status: "error",
        message: "Failed to delete problem."
      },
      { status: 500 }
    );
  }
};
export const adminProblemsUpdateHandler: RouteHandler = async (ctx) => {
  let body: CreateProblemRequestBody & ProblemActionRequestBody;

  try {
    body = (await ctx.request.json()) as CreateProblemRequestBody & ProblemActionRequestBody;
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const problemId = parsePositiveInt(body.problem_id);
  if (!problemId) {
    return Response.json(
      { status: "error", message: "`problem_id` must be a positive integer." },
      { status: 400 }
    );
  }

  const title = parseNonEmptyString(body.title);
  const description = parseNonEmptyString(body.description);
  const xpReward = parseNonNegativeInt(body.xp_reward);

  if (!title || !description || xpReward === null) {
    return Response.json(
      {
        status: "error",
        message:
          "`title` and `description` are required. `xp_reward` must be a non-negative integer."
      },
      { status: 400 }
    );
  }

  const publicTestcase1Input = parseOptionalString(body.public_testcase_1_input);
  const publicTestcase1Output = parseOptionalString(body.public_testcase_1_output);
  const publicTestcase2Input = parseOptionalString(body.public_testcase_2_input);
  const publicTestcase2Output = parseOptionalString(body.public_testcase_2_output);
  const publicTestcase3Input = parseOptionalString(body.public_testcase_3_input);
  const publicTestcase3Output = parseOptionalString(body.public_testcase_3_output);
  const testcases = parseOptionalString(body.testcases);
  const sizeError = validateProblemSizes({
    title,
    description,
    publicTestcases: [
      publicTestcase1Input, publicTestcase1Output,
      publicTestcase2Input, publicTestcase2Output,
      publicTestcase3Input, publicTestcase3Output,
    ],
    testcases,
  });
  if (sizeError) {
    return Response.json({ status: "error", message: sizeError }, { status: 413 });
  }

  try {
    const db = createDbClient(ctx.env.DB);

    const existing = await db.first<ProblemRow>(
      "SELECT id FROM problems WHERE id = ?",
      [problemId]
    );
    if (!existing) {
      return Response.json(
        { status: "error", message: "Problem not found." },
        { status: 404 }
      );
    }

    const result = await db.run(
      `UPDATE problems SET
        title = ?,
        description = ?,
        public_testcase_1_input = ?,
        public_testcase_1_output = ?,
        public_testcase_2_input = ?,
        public_testcase_2_output = ?,
        public_testcase_3_input = ?,
        public_testcase_3_output = ?,
        testcases = ?,
        xp_reward = ?
      WHERE id = ?`,
      [
        title, description,
        publicTestcase1Input, publicTestcase1Output,
        publicTestcase2Input, publicTestcase2Output,
        publicTestcase3Input, publicTestcase3Output,
        testcases, xpReward,
        problemId
      ]
    );

    if (changedRows(result) === 0) {
      return Response.json(
        { status: "error", message: "Problem not found." },
        { status: 404 }
      );
    }

    const updated = await db.first<ProblemRow>(
      `SELECT
        id, title, description,
        public_testcase_1_input, public_testcase_1_output,
        public_testcase_2_input, public_testcase_2_output,
        public_testcase_3_input, public_testcase_3_output,
        testcases, xp_reward, active, created_at
      FROM problems WHERE id = ?`,
      [problemId]
    );

    return Response.json({
      status: "success",
      data: { problem: updated, message: `Problem #${problemId} updated.` }
    });
  } catch (error) {
    if (isLiveCompetitionMutationError(error)) return liveCompetitionMutationResponse();
    return Response.json(
      { status: "error", message: "Failed to update problem." },
      { status: 500 }
    );
  }
};
