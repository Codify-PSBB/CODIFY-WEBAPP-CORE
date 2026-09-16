import { createContext, useContext } from "react";
import type { CompetitionPhase } from "@/types/models";

export interface CompetitionCtxValue {
  phase: CompetitionPhase;
  /** False when a live competition exists but targets a different grade. */
  eligible: boolean;
  targetGrade: number | null;
}

export const CompetitionCtx = createContext<CompetitionCtxValue>({
  phase: "idle",
  eligible: true,
  targetGrade: null,
});

export function useCompetitionContext(): CompetitionCtxValue {
  return useContext(CompetitionCtx);
}