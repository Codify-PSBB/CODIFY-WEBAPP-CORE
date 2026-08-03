import { createDbClient } from "./db";

export type CompetitionPhase = "idle" | "setup" | "live" | "ended";

export interface CompetitionState {
  phase: CompetitionPhase;
  competition_id: number | null;
  started_at: string | null;
}

interface CompetitionRow {
  id: number;
  status: "setup" | "live" | "ended";
  started_at: string | null;
}

const DEFAULT_STATE: CompetitionState = {
  phase: "idle",
  competition_id: null,
  started_at: null,
};

/** D1 is the only authority for lifecycle state. Retired rows remain as history. */
export async function readCompetitionState(dbBinding: D1Database): Promise<CompetitionState> {
  const db = createDbClient(dbBinding);
  const row = await db.first<CompetitionRow>(
    `SELECT id, status, started_at
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
  };
}

export function phaseToLegacyStatus(phase: CompetitionPhase): "ON" | "OFF" {
  return phase === "live" ? "ON" : "OFF";
}
