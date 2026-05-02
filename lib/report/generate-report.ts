import type { PrioritizedAction, ScoreResult } from "../scoring/types";

export type ReportPageDetails = {
  keyword: string;
  location: string;
  url: string;
  title: string;
  metaDescription: string;
};

type GenerateReportInput = {
  page: ReportPageDetails;
  result: ScoreResult;
};

const priorityLabels: Record<PrioritizedAction["priority"], string> = {
  high: "HIGH PRIORITY",
  medium: "MEDIUM PRIORITY",
  low: "LOW PRIORITY"
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

function listItems(items: string[]): string {
  if (items.length === 0) {
    return "- None found";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function getImplementationNote(action: string): string {
  const cleanAction = action.toLowerCase();

  if (cleanAction.includes("faqpage schema")) {
    return "Add JSON-LD FAQPage schema to the page head or through the SEO plugin for the FAQ section already visible on the page.";
  }

  if (cleanAction.includes("internal links")) {
    return "Add contextual links inside relevant service sections to related service or location pages.";
  }

  if (
    cleanAction.includes("schema blocks") ||
    cleanAction.includes("consolidate")
  ) {
    return "Keep one consistent LocalBusiness block where possible, and make sure the business name, phone, URL, and service area match across schema.";
  }

  if (cleanAction.includes("openinghours")) {
    return "Add openingHoursSpecification to the LocalBusiness JSON-LD block.";
  }

  if (
    cleanAction.includes("case study") ||
    cleanAction.includes("example job")
  ) {
    return "Add one short recent job example with the problem, location, fix, and outcome.";
  }

  if (cleanAction.includes("meta wording")) {
    return "Update the SEO title/meta plugin field with clearer benefit-led wording and a call to action.";
  }

  if (cleanAction.includes("areaServed".toLowerCase())) {
    return "Add areaServed to the LocalBusiness JSON-LD block using the target town and surrounding service area.";
  }

  return "Implement this in the page content, template, or SEO settings depending on where the current page is managed.";
}

function formatActions(
  actions: PrioritizedAction[],
  priority: PrioritizedAction["priority"]
): string {
  const filteredActions = actions.filter(
    (action) => action.priority === priority
  );

  if (filteredActions.length === 0) {
    return `${priorityLabels[priority]}\n\nNo actions in this group.`;
  }

  return [
    priorityLabels[priority],
    ...filteredActions.map((action) =>
      [
        "Action:",
        action.action,
        "",
        "What to do:",
        getImplementationNote(action.action),
        "",
        "Why it matters:",
        action.whyItMatters,
        "",
        "Estimated score gain:",
        `+${action.estimatedScoreGain}`
      ].join("\n")
    )
  ].join("\n\n");
}

function formatCategoryScores(scores: ScoreResult["categoryScores"]): string {
  return Object.entries(scores)
    .map(([key, value]) => {
      const label = categoryLabels[key as keyof ScoreResult["categoryScores"]];
      return `- ${label}: ${value}`;
    })
    .join("\n");
}

export function generateDeveloperReport({
  page,
  result
}: GenerateReportInput): string {
  return [
    "LOCAL SEO DEVELOPER REPORT",
    "",
    "PAGE DETAILS",
    `Target keyword: ${page.keyword || "Not provided"}`,
    `Location: ${page.location || "Not provided"}`,
    `URL: ${page.url || "Not provided"}`,
    `Page title: ${page.title || "Not provided"}`,
    `Meta description: ${page.metaDescription || "Not provided"}`,
    "",
    "SCORE SUMMARY",
    `Total score: ${result.totalScore}/100`,
    `Grade: ${result.grade}`,
    "",
    "CATEGORY SCORES",
    formatCategoryScores(result.categoryScores),
    "",
    "RECOMMENDED ACTIONS",
    formatActions(result.prioritizedActions, "high"),
    "",
    formatActions(result.prioritizedActions, "medium"),
    "",
    formatActions(result.prioritizedActions, "low"),
    "",
    "STRENGTHS",
    listItems(result.strengths),
    "",
    "WEAKNESSES",
    listItems(result.weaknesses),
    "",
    "MISSING ITEMS",
    listItems(result.missingItems),
    "",
    "EVIDENCE ITEMS",
    listItems(result.evidenceItems)
  ].join("\n");
}
