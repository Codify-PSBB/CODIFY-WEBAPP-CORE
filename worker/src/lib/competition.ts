// Shared helpers for reading and writing competition state from Cloudflare KV.

export type CompetitionPhase = "idle" | "setup" | "live" | "ended";

export interface CompetitionState {
  phase: CompetitionPhase;
  competition_id: number | null;
  started_at: string | null;
}

const COMPETITION_STATE_KEY = "competition_state";

const DEFAULT_STATE: CompetitionState = {
  phase: "idle",
  competition_id: null,
  started_at: null,
};

export async function readCompetitionState(kv: KVNamespace): Promise<CompetitionState> {
  const raw = await kv.get(COMPETITION_STATE_KEY);
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<CompetitionState>;
    const phase = parsed.phase;
    if (phase !== "idle" && phase !== "setup" && phase !== "live" && phase !== "ended") {
      return { ...DEFAULT_STATE };
    }
    return {
      phase,
      competition_id: typeof parsed.competition_id === "number" ? parsed.competition_id : null,
      started_at: typeof parsed.started_at === "string" ? parsed.started_at : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function writeCompetitionState(kv: KVNamespace, state: CompetitionState): Promise<void> {
  await kv.put(COMPETITION_STATE_KEY, JSON.stringify(state));
}

// Legacy bridge: converts new phase to old "ON"/"OFF" so existing /api/status endpoint
// still works for any clients that haven't updated yet.
export function phaseToLegacyStatus(phase: CompetitionPhase): "ON" | "OFF" {
  return phase === "live" ? "ON" : "OFF";
}
