import { createDbClient } from "../lib/db";
import { readAllActiveCompetitions, type CompetitionRow } from "../lib/competition";
import type { RouteHandler } from "../types";

type ActiveCompRow = CompetitionRow;

// ── GET /api/admin/competition ────────────────────────────────────────────────
// Returns competition state + problem list.
// Accepts optional query params:
//   - ?grade=9 | 10 | both | all
//   - ?competition_id=<id>
// Also returns active_competitions array so admin UI can show Grade 9 and Grade 10 side-by-side.
export const adminCompetitionGetHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);
    const activeCompetitions = await readAllActiveCompetitions(ctx.env.DB);

    const url = new URL(ctx.request.url);
    const gradeParam = url.searchParams.get("grade")?.trim().toLowerCase();
    const compIdParam = url.searchParams.get("competition_id");
    const requestedCompId = compIdParam ? Number(compIdParam) : null;

    let targetGradeFilter: number | null | undefined = undefined;
    if (gradeParam === "9") targetGradeFilter = 9;
    else if (gradeParam === "10") targetGradeFilter = 10;
    else if (gradeParam === "both" || gradeParam === "all") targetGradeFilter = null;

    // Pick selected competition:
    // 1. By requested competition_id if provided
    // 2. By requested grade if provided
    // 3. First active competition (or null if none)
    let selectedComp: ActiveCompRow | null = null;
    if (requestedCompId) {
      selectedComp = activeCompetitions.find((c) => c.id === requestedCompId) ?? null;
      if (!selectedComp) {
        // Fallback: check if it exists in DB even if ended/reset
        selectedComp = await db.first<ActiveCompRow>(
          "SELECT id, status, created_by, started_at, ended_at, created_at, target_grade FROM competitions WHERE id = ?",
          [requestedCompId]
        );
      }
    } else if (targetGradeFilter !== undefined) {
      selectedComp = activeCompetitions.find((c) => c.target_grade === targetGradeFilter) ?? null;
    } else {
      selectedComp = activeCompetitions[0] ?? null;
    }

    let competitionProblems: unknown[] = [];
    let submissionGroupCount = 0;

    if (selectedComp) {
      competitionProblems = await db.all<{
        id: number;
        problem_id: number;
        display_order: number;
        title: string;
        description: string;
        xp_reward: number;
        public_testcase_1_input: string | null;
        public_testcase_1_output: string | null;
        public_testcase_2_input: string | null;
        public_testcase_2_output: string | null;
        public_testcase_3_input: string | null;
        public_testcase_3_output: string | null;
        testcases: string | null;
      }>(
        `SELECT cp.id, cp.problem_id, cp.display_order,
                p.title, p.description, p.xp_reward,
                p.public_testcase_1_input, p.public_testcase_1_output,
                p.public_testcase_2_input, p.public_testcase_2_output,
                p.public_testcase_3_input, p.public_testcase_3_output,
                p.testcases
         FROM competition_problems cp
         JOIN problems p ON p.id = cp.problem_id
         WHERE cp.competition_id = ?
         ORDER BY cp.display_order ASC, cp.id ASC`,
        [selectedComp.id]
      );

      const row = await db.first<{ count: number }>(
        "SELECT COUNT(*) AS count FROM submission_groups WHERE competition_id = ?",
        [selectedComp.id]
      );
      submissionGroupCount = row?.count ?? 0;
    }

    // Build summaries for all active competitions (with counts)
    const activeSummaries = await Promise.all(
      activeCompetitions.map(async (c) => {
        const pCount = await db.first<{ count: number }>(
          "SELECT COUNT(*) AS count FROM competition_problems WHERE competition_id = ?",
          [c.id]
        );
        const sCount = await db.first<{ count: number }>(
          "SELECT COUNT(*) AS count FROM submission_groups WHERE competition_id = ?",
          [c.id]
        );
        return {
          id: c.id,
          status: c.status,
          target_grade: c.target_grade,
          created_by: c.created_by,
          started_at: c.started_at,
          ended_at: c.ended_at,
          created_at: c.created_at,
          problem_count: pCount?.count ?? 0,
          submission_group_count: sCount?.count ?? 0,
        };
      })
    );

    return Response.json({
      status: "success",
      data: {
        phase: selectedComp ? selectedComp.status : "idle",
        competition: selectedComp,
        competition_problems: competitionProblems,
        submission_group_count: submissionGroupCount,
        active_competitions: activeSummaries,
      },
    });
  } catch (err) {
    console.error("adminCompetitionGetHandler error:", err);
    return Response.json({ status: "error", message: "Failed to load competition state." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/create ────────────────────────────────────────
// Creates a new competition in 'setup' phase.
// Body: { target_grade?: 9 | 10 | null }
// Permits Grade 9 and Grade 10 competitions to be created and run simultaneously!
export const adminCompetitionCreateHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => null)) as { target_grade?: unknown } | null;
    let targetGrade: number | null = null;
    const rawTarget = body?.target_grade ?? null;
    if (rawTarget !== null && rawTarget !== undefined) {
      if (rawTarget !== 9 && rawTarget !== 10) {
        return Response.json(
          { status: "error", message: "`target_grade` must be 9, 10, or null (open to both grades)." },
          { status: 400 }
        );
      }
      targetGrade = rawTarget as number;
    }

    const db = createDbClient(ctx.env.DB);

    // Validation:
    // If targetGrade is 9 or 10:
    // 1. Cannot create if a competition for this specific grade is already active
    // 2. Cannot create if a global (open to both) competition is active
    if (targetGrade !== null) {
      const existingGrade = await db.first<{ id: number; status: string }>(
        "SELECT id, status FROM competitions WHERE target_grade = ? AND reset_at IS NULL",
        [targetGrade]
      );
      if (existingGrade) {
        return Response.json(
          { status: "error", message: `A Grade ${targetGrade} competition is already active (status: ${existingGrade.status}). End or reset it first.` },
          { status: 409 }
        );
      }

      const existingGlobal = await db.first<{ id: number; status: string }>(
        "SELECT id, status FROM competitions WHERE target_grade IS NULL AND reset_at IS NULL"
      );
      if (existingGlobal) {
        return Response.json(
          { status: "error", message: "A competition open to both grades is currently active. Reset it before creating grade-specific competitions." },
          { status: 409 }
        );
      }
    } else {
      // If targetGrade is null (both grades):
      // Cannot create if ANY competition is active
      const anyActive = await db.first<{ id: number; target_grade: number | null }>(
        "SELECT id, target_grade FROM competitions WHERE reset_at IS NULL LIMIT 1"
      );
      if (anyActive) {
        return Response.json(
          { status: "error", message: "Cannot create an all-grades competition while other competitions are active. Reset them first." },
          { status: 409 }
        );
      }
    }

    const inserted = await db.first<{ id: number }>(
      "INSERT INTO competitions (status, created_by, target_grade) VALUES ('setup', ?, ?) RETURNING id",
      [ctx.user.email, targetGrade]
    );

    if (!inserted) {
      return Response.json({ status: "error", message: "Failed to create competition." }, { status: 500 });
    }

    return Response.json({
      status: "success",
      data: {
        competition_id: inserted.id,
        phase: "setup",
        target_grade: targetGrade,
        message: targetGrade !== null
          ? `Grade ${targetGrade} competition created. Add problems, then go live.`
          : "Competition created. Add problems, then go live.",
      },
    });
  } catch (err) {
    console.error("adminCompetitionCreateHandler error:", err);
    return Response.json({ status: "error", message: "Failed to create competition." }, { status: 500 });
  }
};

// Helper to resolve competition ID from request body or active competitions
async function resolveCompetitionId(
  dbBinding: D1Database,
  body: { competition_id?: unknown; target_grade?: unknown },
  expectedStatus?: string
): Promise<{ comp: ActiveCompRow | null; error?: string; status?: number }> {
  const db = createDbClient(dbBinding);
  const compId = typeof body.competition_id === "number" ? body.competition_id : null;
  const targetGrade = typeof body.target_grade === "number" ? body.target_grade : null;

  if (compId) {
    const comp = await db.first<ActiveCompRow>(
      "SELECT id, status, created_by, started_at, ended_at, created_at, target_grade FROM competitions WHERE id = ? AND reset_at IS NULL",
      [compId]
    );
    if (!comp) return { comp: null, error: "Competition not found or already reset.", status: 404 };
    if (expectedStatus && comp.status !== expectedStatus) {
      return { comp: null, error: `Competition must be in '${expectedStatus}' phase (currently '${comp.status}').`, status: 409 };
    }
    return { comp };
  }

  if (targetGrade === 9 || targetGrade === 10) {
    const comp = await db.first<ActiveCompRow>(
      "SELECT id, status, created_by, started_at, ended_at, created_at, target_grade FROM competitions WHERE target_grade = ? AND reset_at IS NULL",
      [targetGrade]
    );
    if (!comp) return { comp: null, error: `No active Grade ${targetGrade} competition found.`, status: 404 };
    if (expectedStatus && comp.status !== expectedStatus) {
      return { comp: null, error: `Grade ${targetGrade} competition must be in '${expectedStatus}' phase (currently '${comp.status}').`, status: 409 };
    }
    return { comp };
  }

  // Fallback: look for competition matching expected status
  const query = expectedStatus
    ? "SELECT id, status, created_by, started_at, ended_at, created_at, target_grade FROM competitions WHERE status = ? AND reset_at IS NULL ORDER BY id DESC LIMIT 1"
    : "SELECT id, status, created_by, started_at, ended_at, created_at, target_grade FROM competitions WHERE reset_at IS NULL ORDER BY id DESC LIMIT 1";
  const params = expectedStatus ? [expectedStatus] : [];
  const comp = await db.first<ActiveCompRow>(query, params);
  if (!comp) {
    return {
      comp: null,
      error: expectedStatus ? `No competition found in '${expectedStatus}' phase.` : "No active competition found.",
      status: 404,
    };
  }
  return { comp };
}

// ── POST /api/admin/competition/set-target-grade ─────────────────────────────
export const adminCompetitionSetTargetGradeHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => null)) as {
      competition_id?: unknown;
      target_grade?: unknown;
    } | null;

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body ?? {}, "setup");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    let targetGrade: number | null = null;
    const rawTarget = body?.target_grade ?? null;
    if (rawTarget !== null && rawTarget !== undefined) {
      if (rawTarget !== 9 && rawTarget !== 10) {
        return Response.json(
          { status: "error", message: "`target_grade` must be 9, 10, or null (open to both grades)." },
          { status: 400 }
        );
      }
      targetGrade = rawTarget as number;
    }

    const db = createDbClient(ctx.env.DB);

    // Check collision if updating target grade
    if (targetGrade !== comp.target_grade) {
      if (targetGrade !== null) {
        const existing = await db.first<{ id: number }>(
          "SELECT id FROM competitions WHERE target_grade = ? AND reset_at IS NULL AND id != ?",
          [targetGrade, comp.id]
        );
        if (existing) {
          return Response.json(
            { status: "error", message: `A Grade ${targetGrade} competition is already active.` },
            { status: 409 }
          );
        }
      } else {
        const anyOther = await db.first<{ id: number }>(
          "SELECT id FROM competitions WHERE reset_at IS NULL AND id != ?",
          [comp.id]
        );
        if (anyOther) {
          return Response.json(
            { status: "error", message: "Cannot change to all-grades while another competition is active." },
            { status: 409 }
          );
        }
      }
    }

    await db.run(
      "UPDATE competitions SET target_grade = ? WHERE id = ? AND status = 'setup' AND reset_at IS NULL",
      [targetGrade, comp.id]
    );

    return Response.json({
      status: "success",
      data: {
        competition_id: comp.id,
        target_grade: targetGrade,
        message: targetGrade !== null
          ? `Audience set to Grade ${targetGrade} only.`
          : "Audience set to both grades.",
      },
    });
  } catch (err) {
    console.error("adminCompetitionSetTargetGradeHandler error:", err);
    return Response.json({ status: "error", message: "Failed to update target grade." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/problems/add ──────────────────────────────────
export const adminCompetitionAddProblemHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as {
      competition_id?: unknown;
      problem_id?: unknown;
      target_grade?: unknown;
    };

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body, "setup");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    const problemId = typeof body.problem_id === "number" ? body.problem_id : null;
    if (!problemId) {
      return Response.json({ status: "error", message: "`problem_id` is required." }, { status: 400 });
    }

    const db = createDbClient(ctx.env.DB);
    const problem = await db.first<{ id: number; title: string }>(
      "SELECT id, title FROM problems WHERE id = ?",
      [problemId]
    );
    if (!problem) {
      return Response.json({ status: "error", message: "Problem not found." }, { status: 404 });
    }

    const maxOrder = await db.first<{ max_order: number | null }>(
      "SELECT MAX(display_order) AS max_order FROM competition_problems WHERE competition_id = ?",
      [comp.id]
    );
    const nextOrder = (maxOrder?.max_order ?? -1) + 1;

    await db.run(
      "INSERT INTO competition_problems (competition_id, problem_id, display_order) VALUES (?, ?, ?) ON CONFLICT(competition_id, problem_id) DO NOTHING",
      [comp.id, problemId, nextOrder]
    );

    return Response.json({
      status: "success",
      data: {
        competition_id: comp.id,
        message: `Problem "${problem.title}" added to competition #${comp.id}.`,
      },
    });
  } catch (err) {
    console.error("adminCompetitionAddProblemHandler error:", err);
    return Response.json({ status: "error", message: "Failed to add problem." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/problems/remove ───────────────────────────────
export const adminCompetitionRemoveProblemHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as {
      competition_id?: unknown;
      problem_id?: unknown;
      target_grade?: unknown;
    };

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body, "setup");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    const problemId = typeof body.problem_id === "number" ? body.problem_id : null;
    if (!problemId) {
      return Response.json({ status: "error", message: "`problem_id` is required." }, { status: 400 });
    }

    const db = createDbClient(ctx.env.DB);
    await db.run(
      "DELETE FROM competition_problems WHERE competition_id = ? AND problem_id = ?",
      [comp.id, problemId]
    );

    return Response.json({
      status: "success",
      data: { competition_id: comp.id, message: "Problem removed from competition." },
    });
  } catch (err) {
    console.error("adminCompetitionRemoveProblemHandler error:", err);
    return Response.json({ status: "error", message: "Failed to remove problem." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/go-live ───────────────────────────────────────
export const adminCompetitionGoLiveHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as {
      competition_id?: unknown;
      target_grade?: unknown;
    };

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body, "setup");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    const db = createDbClient(ctx.env.DB);
    const problemCount = await db.first<{ count: number }>(
      "SELECT COUNT(*) AS count FROM competition_problems WHERE competition_id = ?",
      [comp.id]
    );

    if ((problemCount?.count ?? 0) === 0) {
      return Response.json(
        { status: "error", message: "Add at least 1 problem before going live." },
        { status: 422 }
      );
    }

    const startedAt = new Date().toISOString();
    await db.run(
      "UPDATE competitions SET status = 'live', started_at = ? WHERE id = ? AND status = 'setup' AND reset_at IS NULL",
      [startedAt, comp.id]
    );

    return Response.json({
      status: "success",
      data: {
        competition_id: comp.id,
        phase: "live",
        started_at: startedAt,
        target_grade: comp.target_grade,
        message: comp.target_grade !== null
          ? `Grade ${comp.target_grade} competition is now LIVE!`
          : "Competition is now LIVE!",
      },
    });
  } catch (err) {
    console.error("adminCompetitionGoLiveHandler error:", err);
    return Response.json({ status: "error", message: "Failed to go live." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/end ───────────────────────────────────────────
export const adminCompetitionEndHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as {
      competition_id?: unknown;
      target_grade?: unknown;
    };

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body, "live");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    const endedAt = new Date().toISOString();
    const db = createDbClient(ctx.env.DB);
    await db.run(
      "UPDATE competitions SET status = 'ended', ended_at = ? WHERE id = ? AND status = 'live' AND reset_at IS NULL",
      [endedAt, comp.id]
    );

    return Response.json({
      status: "success",
      data: {
        competition_id: comp.id,
        phase: "ended",
        ended_at: endedAt,
        target_grade: comp.target_grade,
        message: comp.target_grade !== null
          ? `Grade ${comp.target_grade} competition ended.`
          : "Competition ended.",
      },
    });
  } catch (err) {
    console.error("adminCompetitionEndHandler error:", err);
    return Response.json({ status: "error", message: "Failed to end competition." }, { status: 500 });
  }
};

// ── POST /api/admin/competition/reset ─────────────────────────────────────────
export const adminCompetitionResetHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) return Response.json({ status: "error", message: "No auth context." }, { status: 500 });

  try {
    const body = (await ctx.request.json().catch(() => ({}))) as {
      competition_id?: unknown;
      target_grade?: unknown;
    };

    const { comp, error, status } = await resolveCompetitionId(ctx.env.DB, body, "ended");
    if (!comp) return Response.json({ status: "error", message: error }, { status: status ?? 400 });

    const db = createDbClient(ctx.env.DB);
    const resetAt = new Date().toISOString();
    await db.run(
      "UPDATE competitions SET reset_at = ? WHERE id = ? AND status = 'ended' AND reset_at IS NULL",
      [resetAt, comp.id]
    );

    return Response.json({
      status: "success",
      data: {
        competition_id: comp.id,
        phase: "idle",
        target_grade: comp.target_grade,
        message: comp.target_grade !== null
          ? `Grade ${comp.target_grade} competition reset to idle.`
          : "Competition reset to idle.",
      },
    });
  } catch (err) {
    console.error("adminCompetitionResetHandler error:", err);
    return Response.json({ status: "error", message: "Failed to reset." }, { status: 500 });
  }
};
