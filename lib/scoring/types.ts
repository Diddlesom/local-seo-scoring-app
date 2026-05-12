export type IntentMode = "local-seo" | "affiliate" | "saas" | "blog-media";

export type ScoringInput = {
  businessName?: string;
  intentMode?: IntentMode;
  keyword?: string;
  location?: string;
  title?: string;
  metaDescription?: string;
  html?: string;
  headings?: {
    h1?: string[];
    h2?: string[];
    h3?: string[];
  };
  schemaJson?: string;
  text?: string;
  websiteUrl?: string;
  relatedInternalLinks?: Array<{
    text: string;
    url: string;
  }>;
};

export type ExtractedSignals = {
  wordCount: number;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  titleKeywordMatch: boolean;
  metaDescriptionKeywordMatch: boolean;
  metaDescriptionLocationMatch: boolean;
  locationMentionCount: number;
  hasPhoneNumber: boolean;
  trustSignals: string[];
  topicSignals: string[];
  ctaWords: string[];
  schemaTypes: string[];
  evidence: string[];
  jsRenderingWarning?: boolean;
  affiliateChecks?: {
    visibleAffiliateDisclosurePresent: boolean;
    affiliateLinksPresent: boolean;
    productReviewComparisonSchemaPresent: boolean;
    amazonAssociateWordingPresent: boolean;
    productSchemaDetected: boolean;
    productSchemaEligibleForSnippets: boolean;
    productSchemaMayBeIneligible: boolean;
    cleanComparisonSchemaPresent: boolean;
  };
};

export type PriorityAction = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
};

export type PrioritizedAction = {
  priority: "high" | "medium" | "low";
  action: string;
  whyItMatters: string;
  estimatedScoreGain: number;
};

export type CategoryScores = {
  content: number;
  headings: number;
  metadata: number;
  localSignals: number;
  trust: number;
  conversion: number;
  schema: number;
};

export type ScoreResult = {
  categoryScores: CategoryScores;
  totalScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  strengths: string[];
  weaknesses: string[];
  missingItems: string[];
  prioritizedActions: PrioritizedAction[];
  evidenceItems: string[];
  signals: ExtractedSignals;
};
