import type { ExtractedSignals, ScoringInput } from "./types";

export function extractSignals(_input: ScoringInput): ExtractedSignals {
  return {
    overview: {},
    missingCoverage: {},
    benchmark: {},
    evidence: []
  };
}
