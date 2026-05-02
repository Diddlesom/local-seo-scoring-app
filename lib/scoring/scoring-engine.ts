import { extractSignals } from "./extractors";
import { createPriorityActions } from "./priority-engine";
import type { ScoreResult, ScoringInput } from "./types";

export function scoreLocalSeo(input: ScoringInput): ScoreResult {
  const signals = extractSignals(input);
  const actions = createPriorityActions(signals);

  return {
    score: null,
    sections: {
      overview: signals.overview,
      missingCoverage: signals.missingCoverage,
      benchmark: signals.benchmark,
      actions,
      evidence: signals.evidence
    }
  };
}
