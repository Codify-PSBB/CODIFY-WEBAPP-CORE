import { createDbClient } from "./db";

export type CompetitionPhase = "idle" | "setup" | "live" | "ended";

export interface CompetitionState {
  phase: CompetitionPhase;
  competition_id: number | null;
  started_at: string | null;
  /** NULL = open to both grades; otherwise 9 or 10. */
  target_grade: number | null;
}

interface CompetitionRow {
  id: number;
  status: "setup" | "live" | "ended";
  started_at: string | null;
  target_grade: number | null;
}

const DEFAULT_STATE: CompetitionState = {
  phase: "idle",
  competition_id: null,
  started_at: null,
  target_grade: null,
};

/** D1 is the only authority for lifecycle state. Retired rows remain as history. */
export async function readCompetitionState(dbBinding: D1Database): Promise<CompetitionState> {
  const db = createDbClient(dbBinding);
  const row = await db.first<CompetitionRow>(
    `SELECT id, status, started_at, target_grade
     FROM competitions
     WHERE reset_at IS NULL
     ORDER BY id DESC
     LIMIT 1`
  );

  if (!row) return { ...DEFAULT_STATE };

  return {
    phase: row.status,
    competition_id: row.id,
    started_at: row.started_at,
    target_grade: row.target_grade,
  };
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
