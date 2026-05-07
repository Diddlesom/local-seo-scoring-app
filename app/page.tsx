"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { generateAiTaskPack } from "../lib/report/generate-ai-task-pack";
import type { ExecutionMode } from "../lib/report/generate-ai-task-pack";
import { generateDeveloperReport } from "../lib/report/generate-report";
import type {
  BenchmarkCompetitor,
  BenchmarkInsights
} from "../lib/report/generate-report";
import { generatePdfReport } from "../lib/report/generate-pdf-report";
import { scoringConfig } from "../lib/scoring/config";
import type { IntentMode, ScoreResult } from "../lib/scoring/types";

type FetchedPageData = {
  title: string;
  metaDescription: string;
  html: string;
  cleanText: string;
  bodyText: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  schemaJson: string;
  faqQuestions: string[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  relatedInternalLinks: Array<{
    text: string;
    url: string;
  }>;
  fetchStatus?: "success" | "limited";
  fetchReason?: string;
  fetchSource?: "direct" | "jina";
};

type ReportDetectedData = {
  faqQuestions: string[];
  faqItems: Array<{
    question: string;
    answer: string;
  }>;
  relatedInternalLinks: Array<{
    text: string;
    url: string;
  }>;
};

type FormState = {
  intentMode: IntentMode;
  keyword: string;
  location: string;
  title: string;
  metaDescription: string;
  websiteUrl: string;
  pageContent: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  schemaJson: string;
  reportData: ReportDetectedData;
};

type TextFormField =
  | "intentMode"
  | "keyword"
  | "location"
  | "title"
  | "metaDescription"
  | "websiteUrl"
  | "pageContent"
  | "schemaJson";

type BenchmarkResult = BenchmarkCompetitor & {
  error?: string;
};

type CompetitorInput = {
  raw: string;
  snippet: string;
  title: string;
  url: string;
};

type CaseStudyState = {
  location: string;
  deviceType: string;
  problem: string;
  fixCompleted: string;
  turnaroundTime: string;
  permissionConfirmed: "no" | "yes";
};

const initialFormState: FormState = {
  intentMode: "local-seo",
  keyword: "",
  location: "",
  title: "",
  metaDescription: "",
  websiteUrl: "",
  pageContent: "",
  headings: {
    h1: [],
    h2: [],
    h3: []
  },
  schemaJson: "",
  reportData: {
    faqQuestions: [],
    faqItems: [],
    relatedInternalLinks: []
  }
};

const initialCaseStudyState: CaseStudyState = {
  location: "",
  deviceType: "",
  problem: "",
  fixCompleted: "",
  turnaroundTime: "",
  permissionConfirmed: "no"
};

const blockedCompetitorDomains = [
  "reddit.com",
  "quora.com",
  "facebook.com",
  "youtube.com"
];

const exampleFormState: FormState = {
  intentMode: "local-seo",
  keyword: "dentist london",
  location: "london",
  title: "",
  metaDescription: "",
  websiteUrl: "https://www.londonsmileclinic.co.uk/",
  pageContent: "",
  headings: {
    h1: [],
    h2: [],
    h3: []
  },
  schemaJson: "",
  reportData: {
    faqQuestions: [],
    faqItems: [],
    relatedInternalLinks: []
  }
};

const categoryLabels: Record<keyof ScoreResult["categoryScores"], string> = {
  content: "Content",
  headings: "Headings",
  metadata: "Metadata",
  localSignals: "Local signals",
  trust: "Trust",
  conversion: "Conversion",
  schema: "Schema"
};

const logoUrl =
  "https://cwccomputerrepairchard.com/wp-content/uploads/2024/02/CWC-Logo-image-1-e1777727757742.png";

const intentModeOptions: Array<{ label: string; value: IntentMode }> = [
  { label: "Local SEO", value: "local-seo" },
  { label: "Affiliate", value: "affiliate" },
  { label: "SaaS", value: "saas" },
  { label: "Blog / Media", value: "blog-media" }
];

const intentModeLabels: Record<IntentMode, string> = {
  "local-seo": "Local SEO",
  affiliate: "Affiliate",
  saas: "SaaS",
  "blog-media": "Blog / Media"
};

const modeNotice =
  "This mode is in early support. Recommendations are adjusted lightly but full scoring is still being developed.";

const localTopicKeywords = [
  "laptop repair",
  "computer repair",
  "pc repair",
  "mac repair",
  "data recovery",
  "virus removal",
  "screen repair",
  "battery replacement",
  "charging port",
  "ssd upgrade",
  "windows setup",
  "home visits",
  "business support",
  "remote support",
  "diagnostics"
];

const intentTopicKeywords: Record<IntentMode, string[]> = {
  "local-seo": localTopicKeywords,
  affiliate: [
    "best",
    "review",
    "comparison",
    "alternatives",
    "pricing",
    "pros and cons",
    "buyer guide",
    "features",
    "discount",
    "deal"
  ],
  saas: [
    "demo",
    "trial",
    "pricing",
    "features",
    "integrations",
    "security",
    "case study",
    "customer",
    "onboarding",
    "support"
  ],
  "blog-media": []
};

const blogMediaTopicPatterns: Array<{ label: string; patterns: RegExp[] }> = [
  {
    label: "startup programs",
    patterns: [
      /\bstartup (?:app|apps|program|programs|item|items)\b/i,
      /\bprograms? (?:that )?(?:run|runs|running|start|starts) (?:at|on) startup\b/i,
      /\bstartup folder\b/i
    ]
  },
  {
    label: "malware",
    patterns: [
      /\bmalware\b/i,
      /\bspyware\b/i,
      /\badware\b/i,
      /\bvirus(?:es)?\b/i,
      /\binfected\b/i
    ]
  },
  {
    label: "SSD upgrades",
    patterns: [
      /\bssd(?:s)?\b/i,
      /\bsolid state drive\b/i,
      /\bdrive upgrade\b/i,
      /\bupgrade (?:to )?(?:an? )?ssd\b/i
    ]
  },
  {
    label: "RAM usage",
    patterns: [
      /\bram\b/i,
      /\bmemory usage\b/i,
      /\bhigh memory\b/i,
      /\bavailable memory\b/i
    ]
  },
  {
    label: "overheating",
    patterns: [
      /\boverheat(?:ing)?\b/i,
      /\brunning hot\b/i,
      /\bfan noise\b/i,
      /\bcooling\b/i,
      /\bthermal\b/i
    ]
  },
  {
    label: "browser tabs",
    patterns: [
      /\bbrowser tabs?\b/i,
      /\btoo many tabs?\b/i,
      /\bchrome tabs?\b/i,
      /\bedge tabs?\b/i
    ]
  },
  {
    label: "Windows updates",
    patterns: [
      /\bwindows updates?\b/i,
      /\bwindows update\b/i,
      /\bupdate history\b/i,
      /\bpending updates?\b/i
    ]
  },
  {
    label: "slow boot times",
    patterns: [
      /\bslow boot(?: time| times)?\b/i,
      /\bslow startup\b/i,
      /\btakes? (?:too )?long to (?:boot|start)\b/i,
      /\bboot time\b/i
    ]
  },
  {
    label: "hard drive failure",
    patterns: [
      /\bhard drive failure\b/i,
      /\bfailing (?:hard )?drive\b/i,
      /\bdisk failure\b/i,
      /\bbad sectors?\b/i,
      /\bclicking drive\b/i
    ]
  },
  {
    label: "antivirus scans",
    patterns: [
      /\bantivirus scan(?:s)?\b/i,
      /\bvirus scan(?:s)?\b/i,
      /\bsecurity scan(?:s)?\b/i,
      /\bdefender scan(?:s)?\b/i
    ]
  },
  {
    label: "background processes",
    patterns: [
      /\bbackground (?:app|apps|process|processes|tasks?)\b/i,
      /\btask manager\b/i,
      /\bhigh cpu\b/i,
      /\bcpu usage\b/i
    ]
  },
  {
    label: "disk space",
    patterns: [
      /\bdisk space\b/i,
      /\blow storage\b/i,
      /\bstorage full\b/i,
      /\bfree up space\b/i
    ]
  },
  {
    label: "temporary files",
    patterns: [
      /\btemporary files?\b/i,
      /\btemp files?\b/i,
      /\bdisk cleanup\b/i,
      /\bcache files?\b/i
    ]
  },
  {
    label: "driver issues",
    patterns: [
      /\bdrivers?\b/i,
      /\bdevice manager\b/i,
      /\boutdated driver\b/i,
      /\bdriver update\b/i
    ]
  },
  {
    label: "hardware diagnostics",
    patterns: [
      /\bhardware diagnostics?\b/i,
      /\bdiagnostic test(?:s)?\b/i,
      /\bhealth check\b/i,
      /\bsystem check\b/i
    ]
  }
];

const executionModes: Array<{
  description: string;
  label: string;
  value: ExecutionMode;
}> = [
  {
    description: "Smallest useful task set for quick implementation.",
    label: "Fast",
    value: "fast"
  },
  {
    description: "Standard task list with practical validation.",
    label: "Balanced",
    value: "balanced"
  },
  {
    description: "Full task list with deeper evidence checks.",
    label: "Thorough",
    value: "thorough"
  }
];

function ResultList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="empty">
        Not enough competitor overlap to identify strong patterns yet
      </p>
    );
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function getScoreStatus(totalScore: number): string {
  if (totalScore >= 90) {
    return "Strong optimisation level.";
  }

  if (totalScore >= 70) {
    return "Moderate optimisation level. Improvements available.";
  }

  return "Weak optimisation level. Prioritise key fixes.";
}

function getHeadingsCount(result: ScoreResult): number {
  return (
    result.signals.headings.h1.length +
    result.signals.headings.h2.length +
    result.signals.headings.h3.length
  );
}

function detectTopicsServices(
  text: string,
  intentMode: IntentMode = "local-seo"
): string[] {
  if (intentMode === "blog-media") {
    return blogMediaTopicPatterns
      .filter((topic) => topic.patterns.some((pattern) => pattern.test(text)))
      .map((topic) => topic.label);
  }

  const cleanText = text.toLowerCase();
  const keywords = intentTopicKeywords[intentMode] ?? localTopicKeywords;

  return keywords.filter((topic) => cleanText.includes(topic));
}

function getBenchmarkGaps({
  competitor,
  competitorText,
  intentMode = "local-seo",
  targetResult,
  targetText
}: {
  competitor: ScoreResult;
  competitorText: string;
  intentMode?: IntentMode;
  targetResult: ScoreResult;
  targetText: string;
}): string[] {
  const gaps = new Set<string>();
  const targetTopics = detectTopicsServices(targetText, intentMode);
  const competitorTopics = detectTopicsServices(competitorText, intentMode);
  const targetHeadingCount = getHeadingsCount(targetResult);
  const competitorHeadingCount = getHeadingsCount(competitor);

  if (competitor.signals.wordCount > targetResult.signals.wordCount + 150) {
    gaps.add(
      "Add more useful service detail because this competitor has deeper page content than your target page."
    );
  }

  if (competitorHeadingCount > targetHeadingCount + 2) {
    gaps.add(
      "Expand the page structure with clearer service subheadings because this competitor uses more headings."
    );
  }

  competitor.signals.schemaTypes.forEach((schemaType) => {
    if (!targetResult.signals.schemaTypes.includes(schemaType)) {
      gaps.add(
        `Add or review ${schemaType} schema because this competitor uses it and your target page does not.`
      );
    }
  });

  competitor.signals.trustSignals.forEach((trustSignal) => {
    if (!targetResult.signals.trustSignals.includes(trustSignal)) {
      gaps.add(
        `Add visible trust proof for ${trustSignal.toLowerCase()} because this competitor shows it and your page does not.`
      );
    }
  });

  competitorTopics.forEach((topic) => {
    if (!targetTopics.includes(topic)) {
      gaps.add(
        `Add a clear mention or short section for ${topic} because competitors cover it and your target page does not.`
      );
    }
  });

  return Array.from(gaps).slice(0, 6);
}

function countValues(items: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((first, second) => second.count - first.count);
}

function getTrustStrength(trustSignals: string[]): "Strong" | "Medium" | "Weak" {
  if (trustSignals.length >= 3) {
    return "Strong";
  }

  if (trustSignals.length >= 1) {
    return "Medium";
  }

  return "Weak";
}

function getCompetitorName(competitor: BenchmarkCompetitor): string {
  if (competitor.title) {
    return competitor.title;
  }

  try {
    return new URL(competitor.url).hostname.replace(/^www\./, "");
  } catch {
    return competitor.url;
  }
}

function getHostname(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedCompetitorDomain(value: string): boolean {
  const hostname = getHostname(value);

  return blockedCompetitorDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

function parseCompetitorInput(rawInput: string): CompetitorInput | null {
  const raw = rawInput.trim();
  const urlMatch = raw.match(/https?:\/\/[^\s,]+/i);

  if (!urlMatch) {
    return null;
  }

  const url = urlMatch[0].replace(/[).,;]+$/g, "");
  const context = raw.replace(urlMatch[0], " ").replace(/\s+/g, " ").trim();
  const [title = "", ...snippetParts] = context
    .split(/\s+[|—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    raw,
    snippet: snippetParts.join(" "),
    title,
    url
  };
}

function getErrorReason(errorMessage: string): string {
  const httpMatch = errorMessage.match(/HTTP\s+\d+/i);

  if (httpMatch) {
    return httpMatch[0].toUpperCase();
  }

  if (/blocked/i.test(errorMessage)) {
    return "blocked request";
  }

  if (/empty|visible page content|little readable/i.test(errorMessage)) {
    return "empty content";
  }

  return errorMessage || "fetch restrictions";
}

function createLimitedBenchmarkResult({
  intentMode,
  input,
  reason,
  snippetOnly = false,
  status = "inaccessible"
}: {
  intentMode: IntentMode;
  input: CompetitorInput;
  reason: string;
  snippetOnly?: boolean;
  status?: "inaccessible" | "limited";
}): BenchmarkResult {
  const snippetText = [input.title, input.snippet].filter(Boolean).join(" ");
  const snippetTopics = snippetOnly
    ? detectTopicsServices(snippetText, intentMode)
    : [];

  return {
    url: input.url,
    title: input.title || getHostname(input.url) || input.url,
    wordCount: 0,
    headingsCount: 0,
    schemaTypes: [],
    trustSignals: [],
    topicsServices: snippetTopics,
    gapsFound: [],
    fetchReason: `Competitor page could not be fully analysed due to fetch restrictions. Reason: ${reason}.`,
    fetchStatus: status,
    insightSource: snippetOnly ? "snippet-only" : "none"
  };
}

function formatCompetitorCount(count: number, total: number): string {
  return `${count} of ${total} competitors`;
}

function simplifyBenchmarkGap(gap: string): string {
  const cleanGap = gap.toLowerCase();

  if (cleanGap.includes("deeper page content")) {
    return "One competitor has deeper content";
  }

  if (cleanGap.includes("more headings")) {
    return "Fewer service subheadings than competitors";
  }

  if (cleanGap.includes("schema")) {
    const schemaMatch = gap.match(/([A-Za-z]+)\s+schema/i);
    const schemaType = schemaMatch?.[1] ?? schemaMatch?.[2] ?? "schema";

    return `Missing ${schemaType} schema used by competitors`;
  }

  if (cleanGap.includes("trust proof")) {
    const trustMatch = gap.match(/for (.*?) because/i);
    const trustSignal = trustMatch?.[1] ?? "trust proof";

    return `Missing ${trustSignal} (used by competitors)`;
  }

  if (cleanGap.includes("short section for")) {
    const topicMatch = gap.match(/for (.*?) because/i);
    const topic = topicMatch?.[1] ?? "service coverage";

    return `Missing ${topic} coverage`;
  }

  return gap;
}

function uniqueItems(items: string[]): string[] {
  return Array.from(new Set(items));
}

function groupPriorityActions(actions: string[]): BenchmarkInsights["priorityActionGroups"] {
  const groups: BenchmarkInsights["priorityActionGroups"] = {
    contentDepth: [],
    trustSignals: [],
    serviceCoverage: [],
    pageStructure: []
  };

  uniqueItems(actions).forEach((action) => {
    const cleanAction = action.toLowerCase();

    if (
      cleanAction.includes("content") ||
      cleanAction.includes("word") ||
      cleanAction.includes("service detail")
    ) {
      groups.contentDepth.push(action);
      return;
    }

    if (
      cleanAction.includes("trust") ||
      cleanAction.includes("proof") ||
      cleanAction.includes("review") ||
      cleanAction.includes("testimonial")
    ) {
      groups.trustSignals.push(action);
      return;
    }

    if (
      cleanAction.includes("coverage") ||
      cleanAction.includes("mention") ||
      cleanAction.includes("section for")
    ) {
      groups.serviceCoverage.push(action);
      return;
    }

    groups.pageStructure.push(action);
  });

  return groups;
}

function getRelativeGap(targetValue: number, averageValue: number): number {
  if (averageValue <= 0) {
    return targetValue <= 0 ? 0 : -1;
  }

  return (averageValue - targetValue) / averageValue;
}

function getTopRecommendedNextStep({
  contentGap,
  intentMode,
  trustGap,
  serviceGap,
  averageWordCount
}: {
  contentGap: number;
  intentMode: IntentMode;
  trustGap: number;
  serviceGap: number;
  averageWordCount: number;
}): string {
  const trustAction =
    intentMode === "blog-media"
      ? "Improve editorial trust with author expertise, first-hand experience, freshness signals, citations, or related resources."
      : "Improve trust signals with visible reviews, testimonials, guarantees, or named expert proof.";
  const topicAction =
    intentMode === "blog-media"
      ? "Expand informational coverage with semantic depth, troubleshooting detail, and PAA-style questions."
      : "Expand service coverage for important services competitors mention but your page does not.";

  const gaps = [
    {
      action: `Increase content depth toward the competitor average of ${averageWordCount} words.`,
      gap: contentGap
    },
    {
      action: trustAction,
      gap: trustGap
    },
    {
      action: topicAction,
      gap: serviceGap
    }
  ].sort((first, second) => second.gap - first.gap);

  return gaps[0].gap > 0
    ? gaps[0].action
    : "Review competitor-backed actions for small improvements; no single major weakness stands out.";
}

function buildBenchmarkInsights({
  competitors,
  intentMode,
  targetResult,
  targetText
}: {
  competitors: BenchmarkCompetitor[];
  intentMode: IntentMode;
  targetResult: ScoreResult;
  targetText: string;
}): BenchmarkInsights | null {
  if (competitors.length === 0) {
    return null;
  }

  const majorityCount = Math.floor(competitors.length / 2) + 1;
  const averageWordCount = Math.round(
    competitors.reduce((total, competitor) => total + competitor.wordCount, 0) /
      competitors.length
  );
  const targetTopics = detectTopicsServices(targetText, intentMode);
  const topicCounts = countValues(
    competitors.flatMap((competitor) => competitor.topicsServices)
  );
  const trustCounts = countValues(
    competitors.flatMap((competitor) => competitor.trustSignals)
  );
  const schemaCounts = countValues(
    competitors.flatMap((competitor) => competitor.schemaTypes)
  );
  const averageTrustSignals = Math.round(
    competitors.reduce(
      (total, competitor) => total + competitor.trustSignals.length,
      0
    ) / competitors.length
  );
  const averageTopicCount = Math.round(
    competitors.reduce(
      (total, competitor) => total + competitor.topicsServices.length,
      0
    ) / competitors.length
  );
  const majorityTopics = topicCounts.filter(
    (topic) => topic.count >= majorityCount
  );
  const majorityTrustSignals = trustCounts.filter(
    (signal) => signal.count >= majorityCount
  );
  const majoritySchemaTypes = schemaCounts.filter(
    (schema) => schema.count >= majorityCount
  );
  const keyGaps = uniqueItems(
    competitors
      .flatMap((competitor) => competitor.gapsFound)
      .map(simplifyBenchmarkGap)
      .filter(
        (gap) =>
          targetResult.signals.wordCount < averageWordCount ||
          gap !== "One competitor has deeper content"
      )
  ).slice(0, 8);
  const missingMajorityTopics = majorityTopics
    .filter((topic) => !targetTopics.includes(topic.value))
    .map(
      (topic) =>
        `Add ${topic.value} coverage because ${formatCompetitorCount(topic.count, competitors.length)} mention it.`
    );
  const missingMajorityTrustSignals = majorityTrustSignals
    .filter((signal) => !targetResult.signals.trustSignals.includes(signal.value))
    .map(
      (signal) =>
        `Add visible ${signal.value.toLowerCase()} because ${formatCompetitorCount(signal.count, competitors.length)} show it.`
    );
  const missingMajoritySchemaTypes = majoritySchemaTypes
    .filter((schema) => !targetResult.signals.schemaTypes.includes(schema.value))
    .map(
      (schema) =>
        `Add or validate ${schema.value} schema because ${formatCompetitorCount(schema.count, competitors.length)} use it.`
    );
  const contentDepthComparison =
    targetResult.signals.wordCount >= averageWordCount
      ? `Your page has ${targetResult.signals.wordCount} words. Competitor average is ${averageWordCount} words.`
      : `Your page has ${targetResult.signals.wordCount} words. Competitor average is ${averageWordCount} words.`;
  const contentGap = getRelativeGap(
    targetResult.signals.wordCount,
    averageWordCount
  );
  const trustGap = getRelativeGap(
    targetResult.signals.trustSignals.length,
    averageTrustSignals
  );
  const serviceGap = getRelativeGap(targetTopics.length, averageTopicCount);
  const coverageLabel =
    intentMode === "blog-media" ? "topic coverage" : "service coverage";
  const belowAverageAreas = [
    contentGap > 0 ? "content depth" : "",
    trustGap > 0 ? "trust signals" : "",
    serviceGap > 0 ? coverageLabel : ""
  ].filter(Boolean);
  const competitiveAreas = [
    contentGap <= 0 ? "content depth" : "",
    trustGap <= 0 ? "trust signals" : "",
    serviceGap <= 0 ? coverageLabel : ""
  ].filter(Boolean);
  const summaryText =
    belowAverageAreas.length > 0 && competitiveAreas.length > 0
      ? `Your page is competitive in ${competitiveAreas.join(" and ")}, but weaker in ${belowAverageAreas.join(" and ")}.`
      : belowAverageAreas.length > 0
        ? `Your page is weaker than competitors in ${belowAverageAreas.join(" and ")}.`
        : `Your page is competitive in ${competitiveAreas.join(" and ")}.`;
  const priorityActionGroups: BenchmarkInsights["priorityActionGroups"] = {
    contentDepth:
      targetResult.signals.wordCount < averageWordCount
        ? [
            `Your page: ${targetResult.signals.wordCount} words`,
            `Competitor average: ${averageWordCount} words`,
            intentMode === "blog-media"
              ? "Add more semantic depth, examples, and practical editorial detail"
              : "Add more service detail and local relevance"
          ]
        : [],
    trustSignals:
      intentMode === "blog-media"
        ? [
            "Add author expertise or reviewer details",
            "Add first-hand experience wording where accurate",
            "Add freshness/date signals",
            "Add citations or supporting resources"
          ]
        : [
            "Add testimonials (used by competitors)",
            "Add customer-style review wording",
            "Add independent business messaging",
            "Add family-run or guarantee messaging if accurate"
          ],
    serviceCoverage:
      intentMode === "blog-media"
        ? [
            "Improve semantic breadth around the main topic",
            "Expand troubleshooting sections",
            "Add PAA-style questions and answers"
          ]
        : [
            "Add a computer repair section",
            "Add a pc repair section",
            "Consider mac repair and SSD upgrade if relevant"
          ],
    pageStructure:
      intentMode === "blog-media"
        ? [
            "Add examples, checklists, or comparison tables",
            "Improve media richness with useful screenshots, diagrams, or video"
          ]
        : [
            "Add more service subheadings",
            "Break content into clearer sections"
          ]
  };
  const priorityActions = [
    ...priorityActionGroups.contentDepth,
    ...priorityActionGroups.trustSignals,
    ...priorityActionGroups.serviceCoverage,
    ...priorityActionGroups.pageStructure
  ];

  return {
    intentMode,
    targetWordCount: targetResult.signals.wordCount,
    averageWordCount,
    overallCompetitivePosition: [
      contentGap > 0
        ? "Content depth is below the competitor average."
        : "Content depth is competitive against the current benchmark.",
      trustGap > 0
        ? "Trust signals are below the competitor average."
        : "Trust signals are competitive against the current benchmark.",
      serviceGap > 0
        ? intentMode === "blog-media"
          ? "Topic coverage is below the competitor average."
          : "Service coverage is below the competitor average."
        : intentMode === "blog-media"
          ? "Topic coverage is competitive against the current benchmark."
          : "Service coverage is competitive against the current benchmark.",
      belowAverageAreas.length > 0
        ? `Summary: your page is behind competitors on ${belowAverageAreas.join(", ")}.`
        : "Summary: your page is broadly competitive against the current competitor set."
    ],
    overallPositionSections: {
      contentDepth:
        contentGap > 0
          ? "Below competitor average."
          : "Content depth is above competitor average.",
      trustSignals:
        trustGap > 0
          ? "Below competitor average."
          : "Competitive with competitor average.",
      serviceCoverage:
        serviceGap > 0
          ? "Below competitor average."
          : "Competitive with competitor average.",
      summary:
        summaryText
    },
    commonPatterns: [
      ...majorityTopics.map(
        (topic) =>
          `${topic.value} is commonly mentioned (${formatCompetitorCount(topic.count, competitors.length)}).`
      ),
      ...majoritySchemaTypes.map(
        (schema) =>
          `${schema.value} schema is widely used (${formatCompetitorCount(schema.count, competitors.length)}).`
      ),
      ...majorityTrustSignals.map(
        (signal) =>
          `${signal.value} appears consistently as a trust signal (${formatCompetitorCount(signal.count, competitors.length)}).`
      )
    ].slice(0, 8),
    majoritySignals: [
      ...majorityTopics.map(
        (topic) =>
          `${topic.value}: ${formatCompetitorCount(topic.count, competitors.length)}`
      ),
      ...majorityTrustSignals.map(
        (signal) =>
          `${signal.value}: ${formatCompetitorCount(signal.count, competitors.length)}`
      ),
      ...majoritySchemaTypes.map(
        (schema) =>
          `${schema.value} schema: ${formatCompetitorCount(schema.count, competitors.length)}`
      )
    ].slice(0, 8),
    contentDepthComparison,
    topicServiceOverlap: topicCounts
      .slice(0, 8)
      .map(
        (topic) =>
          `${topic.value}: found on ${formatCompetitorCount(topic.count, competitors.length)}`
      ),
    trustSignalPresence: trustCounts.length
      ? trustCounts.map(
          (signal) =>
            `${signal.value}: found on ${formatCompetitorCount(signal.count, competitors.length)}`
        )
      : ["No strong trust signals were detected across competitors."],
    schemaUsage: schemaCounts.length
      ? schemaCounts.map(
          (schema) =>
            `${schema.value}: used by ${formatCompetitorCount(schema.count, competitors.length)}`
        )
      : ["No target schema types were detected across competitors."],
    keyGaps,
    topRecommendedNextStep: getTopRecommendedNextStep({
      contentGap,
      intentMode,
      trustGap,
      serviceGap,
      averageWordCount
    }),
    priorityActions,
    priorityActionGroups,
    summaryRows: competitors.map((competitor) => ({
      name: getCompetitorName(competitor),
      url: competitor.url,
      wordCount: competitor.wordCount,
      headingsCount: competitor.headingsCount,
      schemaPresence: competitor.schemaTypes.length
        ? competitor.schemaTypes.join(", ")
        : "None",
      trustStrength: getTrustStrength(competitor.trustSignals)
    }))
  };
}

function formatIssueText(issue: string, intentMode: IntentMode): string {
  if (issue.toLowerCase().includes("page content is thin")) {
    return intentMode === "blog-media"
      ? "⚠️ Low content depth detected. Expand article sections with more semantic detail, examples, and supporting links."
      : "⚠️ Low content depth detected. Expand service sections and add more local detail to improve rankings.";
  }

  if (
    issue === "Low content depth detected. Add more service detail to improve rankings."
  ) {
    return intentMode === "blog-media"
      ? "⚠️ Low content depth detected. Expand article sections with more semantic detail, examples, and supporting links."
      : "⚠️ Low content depth detected. Expand service sections and add more local detail to improve rankings.";
  }

  return issue;
}

function TopIssues({
  intentMode,
  result
}: {
  intentMode: IntentMode;
  result: ScoreResult;
}) {
  const issues =
    result.weaknesses.length > 0
      ? result.weaknesses.slice(0, 3)
      : result.missingItems.length > 0
        ? result.missingItems.slice(0, 3)
        : result.prioritizedActions.length > 0
          ? result.prioritizedActions
              .slice(0, 3)
              .map((action) => action.action)
          : [];

  return (
    <section className="top-issues card">
      <div>
        <span className="eyebrow">Priority snapshot</span>
        <h2>Top issues found</h2>
      </div>
      {issues.length > 0 ? (
        <ul>
          {issues.map((issue) => (
            <li key={issue}>{formatIssueText(issue, intentMode)}</li>
          ))}
        </ul>
      ) : (
        <p>
          No major issues found. Review recommended actions for optional
          improvements.
        </p>
      )}
      <p className="why-this-matters">
        Why this matters:{" "}
        {intentMode === "blog-media"
          ? "Pages with stronger semantic depth, editorial trust signals, and related internal links tend to perform better for informational searches."
          : "Pages with stronger content depth, trust signals, and internal linking tend to perform better for local service searches."}
      </p>
      <a className="guided-link" href="#recommended-actions">
        View recommended fixes →
      </a>
    </section>
  );
}

function CategoryScoreBar({
  category,
  intentMode,
  score
}: {
  category: keyof ScoreResult["categoryScores"];
  intentMode: IntentMode;
  score: number;
}) {
  const maxScore = scoringConfig.categoryWeights[category];
  const percentage = Math.min(Math.round((score / maxScore) * 100), 100);
  const categoryLabel =
    intentMode === "blog-media" && category === "localSignals"
      ? "Topic coverage"
      : categoryLabels[category];

  return (
    <div className="score-bar-row">
      <div className="score-bar-label">
        <span>{categoryLabel}</span>
        <strong>
          {score}
          <small> / {maxScore}</small>
        </strong>
      </div>
      <div
        aria-label={`${categoryLabel} score ${score} out of ${maxScore}`}
        className="score-bar-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxScore}
        aria-valuenow={score}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function RecommendedActions({
  actions,
  priority
}: {
  actions: ScoreResult["prioritizedActions"];
  priority: "high" | "medium" | "low";
}) {
  const filteredActions = actions.filter(
    (action) => action.priority === priority
  );

  if (filteredActions.length === 0) {
    return <p className="empty">No actions in this group.</p>;
  }

  return (
    <div className="action-list">
      {filteredActions.map((action) => (
        <div className="action-card" key={action.action}>
          <strong>{action.action}</strong>
          <p>{action.whyItMatters}</p>
          <span>Estimated score gain: {action.estimatedScoreGain}</span>
        </div>
      ))}
    </div>
  );
}

function InlineList({
  items,
  emptyText = "None detected"
}: {
  items: string[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <span className="muted-inline">{emptyText}</span>;
  }

  return <span>{items.join(", ")}</span>;
}

function BenchmarkInsightsPanel({
  insights
}: {
  insights: BenchmarkInsights;
}) {
  const isBlogMedia = insights.intentMode === "blog-media";
  const actionGroups = [
    ["Increase content depth", insights.priorityActionGroups.contentDepth],
    ["Improve trust signals", insights.priorityActionGroups.trustSignals],
    [
      isBlogMedia ? "Expand topic coverage" : "Expand service coverage",
      insights.priorityActionGroups.serviceCoverage
    ],
    ["Improve page structure", insights.priorityActionGroups.pageStructure]
  ] as const;

  return (
    <div className="combined-insights">
      <section className="insight-block">
        <span className="eyebrow">Combined Competitor Insights</span>
        <h3>What competitors are doing well</h3>
        <ResultList items={insights.commonPatterns} />
      </section>

      <section className="insight-block">
        <h3>Overall competitive position</h3>
        <div className="position-list">
          <p>
            <strong>Content depth</strong>
            {insights.overallPositionSections.contentDepth}
          </p>
          <p>
            <strong>Trust signals</strong>
            {insights.overallPositionSections.trustSignals}
          </p>
          <p>
            <strong>{isBlogMedia ? "Topic coverage" : "Service coverage"}</strong>
            {insights.overallPositionSections.serviceCoverage}
          </p>
          <p>
            <strong>Summary</strong>
            {insights.overallPositionSections.summary}
          </p>
        </div>
      </section>

      <section className="insight-block">
        <h3>Majority signals</h3>
        <ResultList items={insights.majoritySignals} />
      </section>

      <section className="insight-block">
        <h3>Content depth comparison</h3>
        <p>{insights.contentDepthComparison}</p>
      </section>

      <section className="insight-block">
        <h3>Topic/service overlap</h3>
        <ResultList items={insights.topicServiceOverlap} />
      </section>

      <section className="insight-block">
        <h3>Trust signal presence</h3>
        <ResultList items={insights.trustSignalPresence} />
      </section>

      <section className="insight-block">
        <h3>Schema usage</h3>
        <ResultList items={insights.schemaUsage} />
      </section>

      <section className="insight-block highlight-block">
        <h3>Key gaps on your page</h3>
        <ResultList items={insights.keyGaps} />
      </section>

      <section className="insight-block highlight-block">
        <h3>Top recommended next step</h3>
        <p>{insights.topRecommendedNextStep}</p>
      </section>

      <section className="insight-block highlight-block">
        <h3>Priority actions based on competitors</h3>
        <p className="action-helper">
          Recommended improvements are based on competitor comparison. Focus on
          the top action first for the fastest impact.
        </p>
        <ol className="benchmark-action-groups">
          {actionGroups.map(([label, actions]) =>
            actions.length > 0 ? (
              <li key={label}>
                <strong>{label}</strong>
                <ul>
                  {actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </li>
            ) : null
          )}
        </ol>
      </section>

      <section className="insight-block summary-table-block">
        <h3>Competitor summary table</h3>
        <div className="benchmark-table-wrap">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>URL or name</th>
                <th>Words</th>
                <th>Headings</th>
                <th>Schema</th>
                <th>Trust</th>
              </tr>
            </thead>
            <tbody>
              {insights.summaryRows.map((row) => (
                <tr key={row.url}>
                  <td>
                    <strong>{row.name}</strong>
                    <span>{row.url}</span>
                  </td>
                  <td>{row.wordCount}</td>
                  <td>{row.headingsCount}</td>
                  <td>{row.schemaPresence}</td>
                  <td>
                    <span
                      className={`strength-pill strength-${row.trustStrength.toLowerCase()}`}
                    >
                      {row.trustStrength}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function getMissingCaseStudyFields(caseStudy: CaseStudyState): string[] {
  const missingFields: string[] = [];

  if (!caseStudy.location.trim()) {
    missingFields.push("location / street / area");
  }

  if (!caseStudy.deviceType.trim()) {
    missingFields.push("device type");
  }

  if (!caseStudy.problem.trim()) {
    missingFields.push("problem");
  }

  if (!caseStudy.fixCompleted.trim()) {
    missingFields.push("fix completed");
  }

  if (!caseStudy.turnaroundTime.trim()) {
    missingFields.push("turnaround time");
  }

  return missingFields;
}

function createCaseStudyText(caseStudy: CaseStudyState): string {
  const areaParts = caseStudy.location.split(",").map((part) => part.trim());
  const caseStudyArea = areaParts[areaParts.length - 1] || caseStudy.location;

  return `Recent ${caseStudyArea} repair example: A customer in ${caseStudy.location} had a ${caseStudy.deviceType} that ${caseStudy.problem}. We ${caseStudy.fixCompleted}. The device was returned ${caseStudy.turnaroundTime} fully working.`;
}

function createCaseStudyHtml(caseStudyText: string): string {
  return `<section>
  <h2>Recent local repair example</h2>
  <p>${caseStudyText}</p>
</section>`;
}

function CaseStudyOutput({ caseStudy }: { caseStudy: CaseStudyState }) {
  const missingFields = getMissingCaseStudyFields(caseStudy);

  if (caseStudy.permissionConfirmed !== "yes") {
    return (
      <div className="case-study-output warning-output">
        <h3>Case study not ready to publish</h3>
        <p>
          Permission has not been confirmed. Do not generate publish-ready copy
          until the business owner confirms the details and permission to use the
          example.
        </p>
      </div>
    );
  }

  if (missingFields.length > 0) {
    return (
      <div className="case-study-output warning-output">
        <h3>More confirmed facts needed</h3>
        <p>Business owner must confirm: {missingFields.join(", ")}.</p>
      </div>
    );
  }

  const caseStudyText = createCaseStudyText(caseStudy);
  const htmlVersion = createCaseStudyHtml(caseStudyText);

  return (
    <div className="case-study-output">
      <div>
        <h3>Short case study paragraph</h3>
        <p>{caseStudyText}</p>
      </div>

      <div>
        <h3>HTML version</h3>
        <pre>{htmlVersion}</pre>
      </div>

      <div>
        <h3>Developer Report version</h3>
        <pre>{`Add this confirmed local proof section:\n\n${caseStudyText}`}</pre>
      </div>

      <div>
        <h3>AI Task Pack version</h3>
        <pre>{`Task: Add confirmed local case study proof.\n\nUse this exact confirmed copy:\n${caseStudyText}\n\nDo not invent customer names, reviews, locations, devices, problems, fixes, or turnaround times.`}</pre>
      </div>
    </div>
  );
}

function createReportFileName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname.replace(/^www\./, "")}-seo-report.txt`;
  } catch {
    return "local-seo-report.txt";
  }
}

function createAiTaskPackFileName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname.replace(/^www\./, "")}-ai-task-pack.txt`;
  } catch {
    return "local-seo-ai-task-pack.txt";
  }
}

function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [fetchMessage, setFetchMessage] = useState("");
  const [scoreMessage, setScoreMessage] = useState("");
  const [benchmarkMessage, setBenchmarkMessage] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState(["", "", "", ""]);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>(
    []
  );
  const [caseStudy, setCaseStudy] = useState<CaseStudyState>(
    initialCaseStudyState
  );
  const [executionMode, setExecutionMode] =
    useState<ExecutionMode>("balanced");
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  function updateField<K extends TextFormField>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function loadExample() {
    setForm(exampleFormState);
    setError("");
    setFetchMessage("");
    setScoreMessage("");
    setBenchmarkMessage("");
    setBenchmarkResults([]);
    setResult(null);
  }

  function updateCompetitorUrl(index: number, value: string) {
    setCompetitorUrls((current) =>
      current.map((url, urlIndex) => (urlIndex === index ? value : url))
    );
  }

  function updateCaseStudyField(
    field: keyof CaseStudyState,
    value: string
  ) {
    setCaseStudy((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleFetchUrl() {
    setError("");
    setFetchMessage("");
    setScoreMessage("");
    setBenchmarkMessage("");
    setBenchmarkResults([]);
    setResult(null);

    if (!form.websiteUrl.trim()) {
      setError("Please enter a valid URL before fetching.");
      return;
    }

    setIsFetching(true);

    try {
      const response = await fetch("/api/fetch-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: form.websiteUrl
        })
      });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "The page could not be fetched.";

        throw new Error(errorMessage);
      }

      const pageData = data as FetchedPageData;

      setForm((current) => ({
        ...current,
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        pageContent: pageData.cleanText || pageData.bodyText || pageData.html,
        headings: pageData.headings,
        schemaJson: pageData.schemaJson,
        reportData: {
          faqQuestions: pageData.faqQuestions ?? [],
          faqItems: pageData.faqItems ?? [],
          relatedInternalLinks: pageData.relatedInternalLinks ?? []
        }
      }));
      setFetchMessage("URL fetched. Review the fields, then score the page.");
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "The page could not be fetched."
      );
    } finally {
      setIsFetching(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setScoreMessage("");
    setBenchmarkMessage("");
    setBenchmarkResults([]);
    setResult(null);

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intentMode: form.intentMode,
          keyword: form.keyword,
          location: form.location,
          title: form.title,
          metaDescription: form.metaDescription,
          websiteUrl: form.websiteUrl,
          html: form.pageContent,
          text: form.pageContent,
          headings: form.headings,
          schemaJson: form.schemaJson
        })
      });

      if (!response.ok) {
        throw new Error("The scoring request failed.");
      }

      const data = (await response.json()) as ScoreResult;
      setResult(data);
      setBenchmarkResults([]);
      setScoreMessage("Page analysed successfully.");
      window.requestAnimationFrame(() => {
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth" });
      });
    } catch {
      setError("Something went wrong while scoring the page.");
    } finally {
      setIsLoading(false);
    }
  }

  async function analyseCompetitorUrl(
    input: CompetitorInput
  ): Promise<BenchmarkResult> {
    if (isBlockedCompetitorDomain(input.url)) {
      return createLimitedBenchmarkResult({
        intentMode: form.intentMode,
        input,
        reason: "blocked domain"
      });
    }

    const fetchResponse = await fetch("/api/fetch-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: input.url })
    });
    const fetchedData = (await fetchResponse.json()) as unknown;

    if (!fetchResponse.ok) {
      const errorMessage =
        typeof fetchedData === "object" &&
        fetchedData !== null &&
        "error" in fetchedData &&
        typeof fetchedData.error === "string"
          ? fetchedData.error
          : "Competitor page could not be fetched.";

      return createLimitedBenchmarkResult({
        intentMode: form.intentMode,
        input,
        reason: getErrorReason(errorMessage),
        snippetOnly: Boolean(input.title || input.snippet),
        status: "inaccessible"
      });
    }

    const pageData = fetchedData as FetchedPageData;
    const pageText = pageData.cleanText || pageData.bodyText || pageData.html;

    if (!pageText || pageText.trim().length < 120) {
      return createLimitedBenchmarkResult({
        intentMode: form.intentMode,
        input,
        reason: "empty content",
        snippetOnly: Boolean(input.title || input.snippet),
        status: "limited"
      });
    }

    const scoreResponse = await fetch("/api/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentMode: form.intentMode,
        keyword: form.keyword,
        location: form.location,
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        websiteUrl: input.url,
        html: pageText,
        text: pageText,
        headings: pageData.headings,
        schemaJson: pageData.schemaJson
      })
    });

    if (!scoreResponse.ok) {
      throw new Error("Competitor page could not be scored.");
    }

    const competitorScore = (await scoreResponse.json()) as ScoreResult;

    return {
      url: input.url,
      title: pageData.title || input.title,
      wordCount: competitorScore.signals.wordCount,
      headingsCount: getHeadingsCount(competitorScore),
      schemaTypes: competitorScore.signals.schemaTypes,
      trustSignals: competitorScore.signals.trustSignals,
      topicsServices: detectTopicsServices(pageText, form.intentMode),
      gapsFound: result
        ? getBenchmarkGaps({
            competitor: competitorScore,
            competitorText: pageText,
            intentMode: form.intentMode,
            targetResult: result,
            targetText: form.pageContent
          })
        : [],
      fetchReason: pageData.fetchReason,
      fetchStatus: pageData.fetchStatus === "limited" ? "limited" : "analysed",
      insightSource: "full"
    };
  }

  async function runCompetitorBenchmark() {
    setError("");
    setBenchmarkMessage("");

    if (!result) {
      setError("Please score the target page before running the benchmark.");
      return;
    }

    const inputs = competitorUrls
      .map(parseCompetitorInput)
      .filter((input): input is CompetitorInput => Boolean(input));

    if (inputs.length === 0) {
      setError("Please add at least one competitor URL.");
      return;
    }

    setIsBenchmarking(true);

    try {
      const results = await Promise.all(
        inputs.map(async (input) => {
          try {
            return await analyseCompetitorUrl(input);
          } catch (benchmarkError) {
            return createLimitedBenchmarkResult({
              intentMode: form.intentMode,
              input,
              reason:
                benchmarkError instanceof Error
                  ? getErrorReason(benchmarkError.message)
                  : "fetch restrictions",
              snippetOnly: Boolean(input.title || input.snippet)
            });
          }
        })
      );

      setBenchmarkResults(results);
      setBenchmarkMessage("Competitor benchmark complete.");
    } finally {
      setIsBenchmarking(false);
    }
  }

  function exportDeveloperReport() {
    if (!result) {
      return;
    }

    const report = generateDeveloperReport({
      page: {
        intentMode: form.intentMode,
        keyword: form.keyword,
        location: form.location,
        url: form.websiteUrl,
        title: form.title,
        metaDescription: form.metaDescription,
        faqQuestions: form.reportData.faqQuestions,
        faqItems: form.reportData.faqItems,
        relatedInternalLinks: form.reportData.relatedInternalLinks
      },
      result,
      benchmark: benchmarkResults,
      benchmarkInsights
    });

    downloadTextFile(report, createReportFileName(form.websiteUrl));
  }

  function exportAiTaskPack() {
    if (!result) {
      return;
    }

    const taskPack = generateAiTaskPack({
      page: {
        intentMode: form.intentMode,
        keyword: form.keyword,
        location: form.location,
        url: form.websiteUrl,
        title: form.title,
        metaDescription: form.metaDescription,
        faqQuestions: form.reportData.faqQuestions,
        faqItems: form.reportData.faqItems,
        relatedInternalLinks: form.reportData.relatedInternalLinks
      },
      result,
      benchmark: benchmarkResults,
      benchmarkInsights,
      executionMode
    });

    downloadTextFile(taskPack, createAiTaskPackFileName(form.websiteUrl));
  }

  async function exportBrandedPdfReport() {
    if (!result) {
      return;
    }

    setIsPdfExporting(true);
    setError("");

    try {
      await generatePdfReport({
        page: {
          intentMode: form.intentMode,
          keyword: form.keyword,
          location: form.location,
          url: form.websiteUrl,
          title: form.title,
          metaDescription: form.metaDescription
        },
        result
      });
    } catch {
      setError("The branded PDF report could not be exported.");
    } finally {
      setIsPdfExporting(false);
    }
  }

  const completedBenchmarkResults = benchmarkResults.filter(
    (benchmark): benchmark is BenchmarkCompetitor =>
      benchmark.insightSource === "full"
  );
  const benchmarkInsights =
    result && completedBenchmarkResults.length >= 2
      ? buildBenchmarkInsights({
          competitors: completedBenchmarkResults,
          intentMode: form.intentMode,
          targetResult: result,
          targetText: form.pageContent
        })
      : null;

  return (
    <main className="page">
      <header className="top-bar">
        <div className="brand">
          <div className="logo-mark">
            {logoFailed ? (
              <span>Local SEO</span>
            ) : (
              <img
                alt="Local SEO Scoring App logo"
                onError={() => setLogoFailed(true)}
                src={logoUrl}
              />
            )}
          </div>
          <div>
            <strong>Local SEO Scoring App</strong>
            <span>Page scoring, schema checks, and AI-ready SEO tasks.</span>
          </div>
        </div>
        <nav aria-label="Dashboard navigation">
          <a href="#score-page">Score Page</a>
          <a href="#benchmark">Benchmark</a>
          <a href="#case-study">Case Study</a>
          <a href="#results">Results</a>
          <a href="#exports">Exports</a>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="product-badge">CWC Local SEO Toolkit</span>
          <h1>
            Score local service pages and turn gaps into clear, actionable SEO
            tasks.
          </h1>
          <p>
            Fetch a page, analyse real content, and export tasks your developer
            or AI can execute.
          </p>
          <p className="credibility-line">
            Built for local SEO pages, service businesses, and real-world
            ranking improvements.
          </p>
        </div>
      </section>

      <div className="hero-divider" />

      <form className="score-form card" id="score-page" onSubmit={handleSubmit}>
        <div className="card-heading">
          <div>
            <span className="eyebrow">Page Input</span>
            <h2>Score a local service page</h2>
          </div>
          <button
            className="outline-button"
            onClick={loadExample}
            type="button"
          >
            Load Example
          </button>
        </div>

        <div className="form-grid">
          <label>
            Intent mode
            <select
              name="intentMode"
              onChange={(event) =>
                updateField("intentMode", event.target.value as IntentMode)
              }
              value={form.intentMode}
            >
              {intentModeOptions.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Target keyword
            <input
              name="keyword"
              onChange={(event) => updateField("keyword", event.target.value)}
              placeholder="emergency plumber"
              type="text"
              value={form.keyword}
            />
          </label>

          <label>
            Location
            <input
              name="location"
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="London"
              type="text"
              value={form.location}
            />
          </label>

          <label>
            Page title
            <input
              name="title"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Emergency Plumber in London"
              type="text"
              value={form.title}
            />
          </label>

          <label>
            URL
            <span className="url-row">
              <input
                name="websiteUrl"
                onChange={(event) =>
                  updateField("websiteUrl", event.target.value)
                }
                placeholder="https://example.com/service-page"
                type="url"
                value={form.websiteUrl}
              />
              <button
                className="fetch-button"
                disabled={isFetching}
                onClick={handleFetchUrl}
                type="button"
              >
                {isFetching ? "Fetching..." : "Fetch URL"}
              </button>
            </span>
            <span className="helper-text">
              Tip: Use a real service page URL for best results.
            </span>
          </label>
        </div>

        <p className="form-tip">
          Use a live service page URL, then review the extracted content before
          scoring.
        </p>

        {form.intentMode !== "local-seo" ? (
          <p className="warning-output">
            {modeNotice}
          </p>
        ) : null}

        <label>
          Meta description
          <textarea
            name="metaDescription"
            onChange={(event) =>
              updateField("metaDescription", event.target.value)
            }
            placeholder="Short page description from Google or the site HTML"
            rows={3}
            value={form.metaDescription}
          />
        </label>

        <label>
          Page text or HTML
          <textarea
            name="pageContent"
            onChange={(event) => updateField("pageContent", event.target.value)}
            placeholder="Paste visible page text or the page HTML here"
            rows={10}
            value={form.pageContent}
          />
          <span className="helper-text">
            Fetched automatically from URL, but editable before scoring.
          </span>
        </label>

        <label>
          Optional schema JSON
          <textarea
            name="schemaJson"
            onChange={(event) => updateField("schemaJson", event.target.value)}
            placeholder='{"@type": "LocalBusiness"}'
            rows={5}
            value={form.schemaJson}
          />
        </label>

        <div className="form-actions">
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Scoring..." : "🚀 Score Page"}
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {fetchMessage ? <p className="success">{fetchMessage}</p> : null}
      </form>

      <section className="benchmark-panel card" id="benchmark">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Competitor Benchmark</span>
            <h2>Compare against up to 4 competitors</h2>
            <p>
              Paste competitor URLs manually. This uses the existing page fetch
              and scoring logic; live SERP lookup is not enabled yet.
            </p>
          </div>
          <button
            className="secondary-button benchmark-button"
            disabled={isBenchmarking || !result}
            onClick={runCompetitorBenchmark}
            type="button"
          >
            {isBenchmarking ? "Running benchmark..." : "Run Benchmark"}
          </button>
        </div>

        <div className="competitor-grid">
          {competitorUrls.map((url, index) => (
            <label key={`competitor-${index + 1}`}>
              Competitor URL {index + 1}
              <input
                onChange={(event) =>
                  updateCompetitorUrl(index, event.target.value)
                }
                placeholder="https://competitor-site.com/service-page"
                type="text"
                value={url}
              />
              <span className="helper-text">
                Optional: paste title or snippet text alongside the URL.
              </span>
            </label>
          ))}
        </div>

        {!result ? (
          <p className="helper-text">
            Score the target page first, then run the competitor benchmark.
          </p>
        ) : null}
        {benchmarkMessage ? (
          <p className="success">{benchmarkMessage}</p>
        ) : null}

        {benchmarkResults.length > 0 && completedBenchmarkResults.length < 2 ? (
          <p className="warning-output">
            Competitor benchmark is limited because fewer than two competitor
            pages could be fetched.
          </p>
        ) : null}

        {benchmarkInsights ? (
          <BenchmarkInsightsPanel insights={benchmarkInsights} />
        ) : null}

        {benchmarkResults.length > 0 ? (
          <div className="benchmark-results">
            {benchmarkResults.map((benchmark, index) => (
              <article className="benchmark-card" key={benchmark.url}>
                <span className="eyebrow">Competitor {index + 1}</span>
                <h3>{benchmark.title || benchmark.url}</h3>
                <p className="benchmark-url">{benchmark.url}</p>
                {benchmark.insightSource !== "full" ? (
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        {benchmark.fetchStatus === "limited"
                          ? "Limited fetch"
                          : "Inaccessible"}
                      </dd>
                    </div>
                    <div>
                      <dt>Reason</dt>
                      <dd>
                        {benchmark.fetchReason ||
                          "Competitor page could not be fully analysed due to fetch restrictions."}
                      </dd>
                    </div>
                    {benchmark.insightSource === "snippet-only" ? (
                      <div>
                        <dt>Snippet-only insight</dt>
                        <dd>
                          <InlineList
                            emptyText="No lightweight themes detected from title/snippet"
                            items={benchmark.topicsServices}
                          />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <dl>
                    {benchmark.fetchStatus === "limited" ? (
                      <>
                        <div>
                          <dt>Status</dt>
                          <dd>Limited fetch</dd>
                        </div>
                        <div>
                          <dt>Reason</dt>
                          <dd>
                            {benchmark.fetchReason ||
                              "Fetched using fallback content."}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    <div>
                      <dt>Word count</dt>
                      <dd>{benchmark.wordCount}</dd>
                    </div>
                    <div>
                      <dt>Headings count</dt>
                      <dd>{benchmark.headingsCount}</dd>
                    </div>
                    <div>
                      <dt>Schema types</dt>
                      <dd>
                        <InlineList items={benchmark.schemaTypes} />
                      </dd>
                    </div>
                    <div>
                      <dt>Trust signals</dt>
                      <dd>
                        <InlineList items={benchmark.trustSignals} />
                      </dd>
                    </div>
                    <div>
                      <dt>Topics/services detected</dt>
                      <dd>
                        <InlineList items={benchmark.topicsServices} />
                      </dd>
                    </div>
                    <div>
                      <dt>Target gaps found</dt>
                      <dd>
                        <InlineList
                          emptyText="No clear gaps found"
                          items={benchmark.gapsFound}
                        />
                      </dd>
                    </div>
                  </dl>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="case-study-panel card" id="case-study">
        <div className="card-heading">
          <div>
            <span className="eyebrow">Case Study Generator</span>
            <h2>Create safe local proof content</h2>
            <p>
              Use only confirmed business-owner facts. Do not invent customer
              names, reviews, locations, devices, problems, fixes, or turnaround
              times.
            </p>
          </div>
        </div>

        <div className="case-study-grid">
          <label>
            Location / street / area
            <input
              onChange={(event) =>
                updateCaseStudyField("location", event.target.value)
              }
              placeholder="Barn Close, Crewkerne"
              type="text"
              value={caseStudy.location}
            />
          </label>

          <label>
            Device type
            <input
              onChange={(event) =>
                updateCaseStudyField("deviceType", event.target.value)
              }
              placeholder="Dell laptop"
              type="text"
              value={caseStudy.deviceType}
            />
          </label>

          <label>
            Problem
            <input
              onChange={(event) =>
                updateCaseStudyField("problem", event.target.value)
              }
              placeholder="would not boot"
              type="text"
              value={caseStudy.problem}
            />
          </label>

          <label>
            Fix completed
            <input
              onChange={(event) =>
                updateCaseStudyField("fixCompleted", event.target.value)
              }
              placeholder="safely backed up the hard drive, replaced it with a faster SSD, and restored all their files"
              type="text"
              value={caseStudy.fixCompleted}
            />
          </label>

          <label>
            Turnaround time
            <input
              onChange={(event) =>
                updateCaseStudyField("turnaroundTime", event.target.value)
              }
              placeholder="the next day"
              type="text"
              value={caseStudy.turnaroundTime}
            />
          </label>

          <label>
            Permission confirmed
            <select
              onChange={(event) =>
                updateCaseStudyField(
                  "permissionConfirmed",
                  event.target.value
                )
              }
              value={caseStudy.permissionConfirmed}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>

        <p className="form-tip">
          Safety rule: Do not invent customer names, reviews, locations,
          devices, problems, fixes, or turnaround times.
        </p>

        <CaseStudyOutput caseStudy={caseStudy} />
      </section>

      {result ? (
        <section className="results" id="results" aria-live="polite">
          {scoreMessage ? (
            <p className="score-success">{scoreMessage}</p>
          ) : null}

          <div className="score-summary card">
            <div className="score-main">
              <span className="summary-label">Performance Score</span>
              <strong>{result.totalScore}</strong>
              <span>/100</span>
              <p>{getScoreStatus(result.totalScore)}</p>
            </div>
            <div className="grade-card">
              <span className="summary-label">Grade</span>
              <strong>{result.grade}</strong>
            </div>
          </div>

          <TopIssues intentMode={form.intentMode} result={result} />

          <section className="panel card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Scoring breakdown</span>
                <h2>Category Scores</h2>
              </div>
            </div>
            <div className="score-list">
              {Object.entries(result.categoryScores).map(([key, score]) => (
                <CategoryScoreBar
                  category={key as keyof ScoreResult["categoryScores"]}
                  intentMode={form.intentMode}
                  key={key}
                  score={score}
                />
              ))}
            </div>
          </section>

          <section className="export-panel card" id="exports">
            <div>
              <span className="eyebrow">Reports</span>
              <h2>Export results</h2>
              <p>
                Download a developer-ready report or a controlled AI task pack.
              </p>
            </div>
            <div className="result-actions">
              <button
                className="secondary-button"
                onClick={exportDeveloperReport}
                type="button"
              >
                Export Developer Report
              </button>
              <button
                className="secondary-button pdf-export-button"
                disabled={isPdfExporting}
                onClick={exportBrandedPdfReport}
                type="button"
              >
                {isPdfExporting
                  ? "Exporting PDF..."
                  : "Export Branded PDF Report"}
              </button>
              <fieldset
                aria-label="AI Task Pack execution mode"
                className="execution-mode-toggle"
              >
                <legend>Execution mode</legend>
                <div className="execution-mode-options">
                  {executionModes.map((mode) => (
                    <label
                      className={
                        executionMode === mode.value
                          ? "execution-mode-option selected"
                          : "execution-mode-option"
                      }
                      key={mode.value}
                      title={mode.description}
                    >
                      <input
                        checked={executionMode === mode.value}
                        name="execution-mode"
                        onChange={() => setExecutionMode(mode.value)}
                        type="radio"
                        value={mode.value}
                      />
                      <span>{mode.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                className="primary-button export-primary"
                onClick={exportAiTaskPack}
                type="button"
              >
                Export AI Task Pack
              </button>
            </div>
          </section>

          <section className="panel card" id="recommended-actions">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Next actions</span>
                <h2>Recommended Actions</h2>
              </div>
            </div>
            <div className="recommendation-groups">
              <div>
                <h3>High priority</h3>
                <RecommendedActions
                  actions={result.prioritizedActions}
                  priority="high"
                />
              </div>
              <div>
                <h3>Medium priority</h3>
                <RecommendedActions
                  actions={result.prioritizedActions}
                  priority="medium"
                />
              </div>
              <div>
                <h3>Low priority</h3>
                <RecommendedActions
                  actions={result.prioritizedActions}
                  priority="low"
                />
              </div>
            </div>
          </section>

          <div className="result-grid">
            <section className="panel card">
              <h2>Strengths</h2>
              <ResultList items={result.strengths} />
            </section>

            <section className="panel card">
              <h2>Weaknesses</h2>
              <ResultList items={result.weaknesses} />
            </section>

            <section className="panel card">
              <h2>Missing Items</h2>
              <ResultList items={result.missingItems} />
            </section>

            <section className="panel card">
              <h2>Evidence Items</h2>
              <ResultList items={result.evidenceItems} />
            </section>
          </div>
        </section>
      ) : null}
    </main>
  );
}
