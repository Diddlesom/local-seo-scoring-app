export type ScoringInput = {
  businessName?: string;
  location?: string;
  websiteUrl?: string;
};

export type ExtractedSignals = {
  overview: Record<string, unknown>;
  missingCoverage: Record<string, unknown>;
  benchmark: Record<string, unknown>;
  evidence: string[];
};

export type PriorityAction = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
};

export type ScoreResult = {
  score: number | null;
  sections: {
    overview: Record<string, unknown>;
    missingCoverage: Record<string, unknown>;
    benchmark: Record<string, unknown>;
    actions: PriorityAction[];
    evidence: string[];
  };
};
