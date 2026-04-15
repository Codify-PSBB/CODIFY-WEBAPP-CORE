import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface CompetitionEntryRow {
  id: number;
  user_id: number;
  problem_id: number;
  start_time: string;
  end_time: string | null;
  time_limit_minutes: number;
  status: string;
}

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
  time_limit_minutes: number | null;
}

interface TestCaseRow {
  id: number;
  problem_id: number;
  input: string;
  output: string;
  is_sample: number;
}

interface EnterCompetitionRequest {
  problem_id?: unknown;
  time_limit_minutes?: unknown;
}

interface RunCodeRequest {
  entry_id?: unknown;
  problem_id?: unknown;
  code?: unknown;
}

interface SubmitCodeRequest {
  entry_id?: unknown;
  problem_id?: unknown;
  code?: unknown;
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

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Get competition status - check if user has active entry
export const competitionStatusHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);
    const userId = ctx.user?.userId;

    if (!userId) {
      return Response.json(
        { status: "error", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Find active competition entry for user
    const entry = await db.first<CompetitionEntryRow>(
      `SELECT * FROM competition_entries 
       WHERE user_id = ? AND status = 'active'
       ORDER BY start_time DESC LIMIT 1`,
      [userId]
    );

    if (!entry) {
      return Response.json({
        status: "success",
        data: {
          has_active_entry: false,
        },
      });
    }

    // Calculate remaining time
    const startTime = new Date(entry.start_time).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeLimitSeconds = entry.time_limit_minutes * 60;
    const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);

    // Check if time expired
    if (remainingSeconds === 0 && entry.status === "active") {
      await db.run(
        `UPDATE competition_entries SET status = 'expired', end_time = ? WHERE id = ?`,
        [new Date().toISOString(), entry.id]
      );
    }

    // Get problem details
    const problem = await db.first<ProblemRow>(
      `SELECT * FROM problems WHERE id = ?`,
      [entry.problem_id]
    );

    // Get test cases for problem
    const testCases = await db.all<TestCaseRow>(
      `SELECT * FROM test_cases WHERE problem_id = ? ORDER BY id ASC`,
      [entry.problem_id]
    );

    return Response.json({
      status: "success",
      data: {
        has_active_entry: remainingSeconds > 0,
        entry: {
          id: entry.id,
          user_id: entry.user_id,
          problem_id: entry.problem_id,
          start_time: entry.start_time,
          end_time: entry.end_time,
          time_limit_minutes: entry.time_limit_minutes,
          status: remainingSeconds === 0 ? "expired" : entry.status,
          remaining_seconds: remainingSeconds,
        },
        problem: problem
          ? {
              ...problem,
              test_cases: testCases.map((tc) => ({
                id: tc.id,
                input: tc.input,
                output: tc.output,
                is_sample: tc.is_sample === 1,
              })),
            }
          : null,
      },
    });
  } catch {
    return Response.json(
      { status: "error", message: "Failed to get competition status" },
      { status: 500 }
    );
  }
};

// Enter competition - create new entry
export const competitionEnterHandler: RouteHandler = async (ctx) => {
  let body: EnterCompetitionRequest;

  try {
    body = (await ctx.request.json()) as EnterCompetitionRequest;
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const problemId = parsePositiveInt(body.problem_id);
  const timeLimitMinutes = parsePositiveInt(body.time_limit_minutes) || 10;

  if (!problemId) {
    return Response.json(
      { status: "error", message: "problem_id is required" },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);
    const userId = ctx.user?.userId;

    if (!userId) {
      return Response.json(
        { status: "error", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user already has active entry
    const existingEntry = await db.first<CompetitionEntryRow>(
      `SELECT * FROM competition_entries 
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    if (existingEntry) {
      return Response.json(
        {
          status: "error",
          message: "You already have an active competition entry",
        },
        { status: 409 }
      );
    }

    // Check if problem exists and is active
    const problem = await db.first<ProblemRow>(
      `SELECT * FROM problems WHERE id = ? AND active = 1`,
      [problemId]
    );

    if (!problem) {
      return Response.json(
        { status: "error", message: "Problem not found or not active" },
        { status: 404 }
      );
    }

    // Create competition entry
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO competition_entries (user_id, problem_id, start_time, time_limit_minutes, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problemId, now, timeLimitMinutes, "active"]
    );

    // Get the inserted entry using the returned meta
    const entryId = result.meta.last_row_id;
    const entry = await db.first<CompetitionEntryRow>(
      `SELECT * FROM competition_entries WHERE id = ?`,
      [entryId]
    );

    // Get test cases
    const testCases = await db.all<TestCaseRow>(
      `SELECT * FROM test_cases WHERE problem_id = ? ORDER BY id ASC`,
      [problemId]
    );

    return Response.json(
      {
        status: "success",
        data: {
          entry: entry
            ? {
                id: entry.id,
                user_id: entry.user_id,
                problem_id: entry.problem_id,
                start_time: entry.start_time,
                end_time: entry.end_time,
                time_limit_minutes: entry.time_limit_minutes,
                status: entry.status,
                remaining_seconds: timeLimitMinutes * 60, // Full time available at start
              }
            : null,
          problem: {
            ...problem,
            test_cases: testCases.map((tc) => ({
              id: tc.id,
              input: tc.input,
              output: tc.output,
              is_sample: tc.is_sample === 1,
            })),
          },
        },
      },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { status: "error", message: "Failed to enter competition" },
      { status: 500 }
    );
  }
};

// Run code against test cases
export const competitionRunHandler: RouteHandler = async (ctx) => {
  let body: RunCodeRequest;

  try {
    body = (await ctx.request.json()) as RunCodeRequest;
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const entryId = parsePositiveInt(body.entry_id);
  const problemId = parsePositiveInt(body.problem_id);
  const code = parseNonEmptyString(body.code);

  if (!entryId || !problemId || !code) {
    return Response.json(
      { status: "error", message: "entry_id, problem_id, and code are required" },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);
    const userId = ctx.user?.userId;

    if (!userId) {
      return Response.json(
        { status: "error", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify entry belongs to user and is active
    const entry = await db.first<CompetitionEntryRow>(
      `SELECT * FROM competition_entries WHERE id = ? AND user_id = ? AND status = 'active'`,
      [entryId, userId]
    );

    if (!entry) {
      return Response.json(
        { status: "error", message: "No active competition entry found" },
        { status: 404 }
      );
    }

    // Check if time expired
    const startTime = new Date(entry.start_time).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeLimitSeconds = entry.time_limit_minutes * 60;

    if (elapsedSeconds > timeLimitSeconds) {
      await db.run(
        `UPDATE competition_entries SET status = 'expired', end_time = ? WHERE id = ?`,
        [new Date().toISOString(), entryId]
      );
      return Response.json(
        { status: "error", message: "Competition time has expired" },
        { status: 410 }
      );
    }

    // Get test cases (including hidden ones)
    const testCases = await db.all<TestCaseRow>(
      `SELECT * FROM test_cases WHERE problem_id = ? ORDER BY id ASC`,
      [problemId]
    );

    // For now, return the test cases for frontend to show
    // In a full implementation, you'd run the code against test cases in a sandbox
    // This is a simplified version that returns test cases for display

    // Mock results - in production, you'd actually run the code
    const results = testCases.map((tc) => ({
      test_case_id: tc.id,
      input: tc.input,
      expected_output: tc.output,
      actual_output: "", // Would be populated by actual code execution
      passed: false, // Would be determined by actual code execution
    }));

    return Response.json({
      status: "success",
      data: {
        output: `Code received for problem #${problemId}. ${testCases.length} test cases available.\n` +
                `Sample cases shown to user: ${testCases.filter(tc => tc.is_sample).length}\n` +
                `Hidden cases for validation: ${testCases.filter(tc => !tc.is_sample).length}`,
        results,
      },
    });
  } catch {
    return Response.json(
      { status: "error", message: "Failed to run code" },
      { status: 500 }
    );
  }
};

// Submit competition solution
export const competitionSubmitHandler: RouteHandler = async (ctx) => {
  let body: SubmitCodeRequest;

  try {
    body = (await ctx.request.json()) as SubmitCodeRequest;
  } catch {
    return Response.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const entryId = parsePositiveInt(body.entry_id);
  const problemId = parsePositiveInt(body.problem_id);
  const code = parseNonEmptyString(body.code);

  if (!entryId || !problemId || !code) {
    return Response.json(
      { status: "error", message: "entry_id, problem_id, and code are required" },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);
    const userId = ctx.user?.userId;

    if (!userId) {
      return Response.json(
        { status: "error", message: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify entry belongs to user and is active
    const entry = await db.first<CompetitionEntryRow>(
      `SELECT * FROM competition_entries WHERE id = ? AND user_id = ? AND status = 'active'`,
      [entryId, userId]
    );

    if (!entry) {
      return Response.json(
        { status: "error", message: "No active competition entry found" },
        { status: 404 }
      );
    }

    // Check if time expired
    const startTime = new Date(entry.start_time).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeLimitSeconds = entry.time_limit_minutes * 60;

    if (elapsedSeconds > timeLimitSeconds) {
      await db.run(
        `UPDATE competition_entries SET status = 'expired', end_time = ? WHERE id = ?`,
        [new Date().toISOString(), entryId]
      );
      return Response.json(
        { status: "error", message: "Competition time has expired - submission rejected" },
        { status: 410 }
      );
    }

    // Create submission
    await db.run(
      `INSERT INTO submissions (user_id, problem_id, code, status, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, problemId, code, "pending", new Date().toISOString()]
    );

    // Mark entry as completed
    await db.run(
      `UPDATE competition_entries SET status = 'completed', end_time = ? WHERE id = ?`,
      [new Date().toISOString(), entryId]
    );

    const submission = await db.first<{
      id: number;
      user_id: number;
      problem_id: number;
      status: string;
      created_at: string;
    }>(`SELECT * FROM submissions WHERE id = last_insert_rowid()`);

    return Response.json({
      status: "success",
      data: {
        submission: submission
          ? {
              id: submission.id,
              user_id: submission.user_id,
              problem_id: submission.problem_id,
              status: submission.status,
              created_at: submission.created_at,
            }
          : null,
        message: "Solution submitted successfully!",
      },
    });
  } catch {
    return Response.json(
      { status: "error", message: "Failed to submit solution" },
      { status: 500 }
    );
  }
};
