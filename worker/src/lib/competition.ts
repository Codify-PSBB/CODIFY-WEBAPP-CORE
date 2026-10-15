import { createDbClient } from "./db";

export type CompetitionPhase = "idle" | "setup" | "live" | "ended";

export interface CompetitionState {
  phase: CompetitionPhase;
  competition_id: number | null;
  started_at: string | null;
  /** NULL = open to both grades; otherwise 9 or 10. */
  target_grade: number | null;
}

export interface CompetitionRow {
  id: number;
  status: "setup" | "live" | "ended";
  started_at: string | null;
  target_grade: number | null;
  created_by: string;
  ended_at?: string | null;
  created_at?: string;
}

const DEFAULT_STATE: CompetitionState = {
  phase: "idle",
  competition_id: null,
  started_at: null,
  target_grade: null,
};

/**
 * Reads competition state for a specific target grade (9 or 10) or all grades.
 * If grade is provided:
 * 1. Checks for an active competition specifically matching that grade.
 * 2. If none, checks for an active competition open to both grades (target_grade IS NULL).
 * If grade is not provided:
 * Looks for any active competition.
 */
export async function readCompetitionState(
  dbBinding: D1Database,
  memberGrade?: number | null
): Promise<CompetitionState> {
  const db = createDbClient(dbBinding);
  let row: CompetitionRow | null = null;

  if (memberGrade === 9 || memberGrade === 10) {
    row = await db.first<CompetitionRow>(
      `SELECT id, status, started_at, target_grade, created_by, ended_at, created_at
       FROM competitions
       WHERE reset_at IS NULL
         AND (target_grade = ? OR target_grade IS NULL)
       ORDER BY (CASE WHEN target_grade = ? THEN 0 ELSE 1 END), id DESC
       LIMIT 1`,
      [memberGrade, memberGrade]
    );
  } else {
    row = await db.first<CompetitionRow>(
      `SELECT id, status, started_at, target_grade, created_by, ended_at, created_at
       FROM competitions
       WHERE reset_at IS NULL
       ORDER BY id DESC
       LIMIT 1`
    );
  }

  if (!row) return { ...DEFAULT_STATE };

  return {
    phase: row.status,
    competition_id: row.id,
    started_at: row.started_at,
    target_grade: row.target_grade,
  };
}

export async function readCompetitionById(
  dbBinding: D1Database,
  competitionId: number
): Promise<CompetitionRow | null> {
  const db = createDbClient(dbBinding);
  return db.first<CompetitionRow>(
    `SELECT id, status, started_at, target_grade, created_by, ended_at, created_at
     FROM competitions
     WHERE id = ? AND reset_at IS NULL`,
    [competitionId]
  );
}

export async function readAllActiveCompetitions(
  dbBinding: D1Database
): Promise<CompetitionRow[]> {
  const db = createDbClient(dbBinding);
  return db.all<CompetitionRow>(
    `SELECT id, status, started_at, target_grade, created_by, ended_at, created_at
     FROM competitions
     WHERE reset_at IS NULL
     ORDER BY (CASE WHEN target_grade IS NULL THEN 0 ELSE target_grade END) ASC, id DESC`
  );
}

/**
 * Whether a member is allowed to see/enter the competition.
 * A NULL target opens the competition to both grades; a target of 9/10
 * requires the member's grade to match exactly. Ungraded members are
 * ineligible for any targeted competition.
 */
export function isGradeEligible(targetGrade: number | null, memberGrade: number | null): boolean {
  if (targetGrade === null) return true;
  return memberGrade === targetGrade;
}

export function phaseToLegacyStatus(phase: CompetitionPhase): "ON" | "OFF" {
  return phase === "live" ? "ON" : "OFF";
}
