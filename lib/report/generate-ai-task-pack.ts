import type {
  BenchmarkCompetitor,
  BenchmarkInsights,
  ReportPageDetails
} from "./generate-report";
import type { PrioritizedAction, ScoreResult } from "../scoring/types";

type GenerateAiTaskPackInput = {
  page: ReportPageDetails;
  result: ScoreResult;
  benchmark?: BenchmarkCompetitor[];
  benchmarkInsights?: BenchmarkInsights | null;
};

const priorityLabels: Record<PrioritizedAction["priority"], string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW"
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_entity, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_entity, code) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function cleanText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function normalizeUrlForComparison(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.replace(/\/+$/g, "") || "/";

    return `${parsedUrl.origin}${pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/g, "");
  }
}

function looksLikeBlogUrl(url: string): boolean {
  try {
    return /\/(blog|news|article|articles|post|posts|category|tag)\//i.test(
      new URL(url).pathname
    );
  } catch {
    return /\b(blog|news|article|post|category|tag)\b/i.test(url);
  }
}

function getInternalLinkScore(link: { text: string; url: string }): number {
  const comparable = `${link.text} ${link.url}`.toLowerCase();
  const priorityTerms = [
    "computer-repair",
    "computer repair",
    "repair",
    "laptop",
    "mac",
    "data-recovery",
    "data recovery",
    "virus",
    "service",
    "location"
  ];

  return priorityTerms.reduce(
    (score, term) => score + (comparable.includes(term) ? 1 : 0),
    0
  );
}

function getStrongInternalLinks(
  page: ReportPageDetails
): ReportPageDetails["relatedInternalLinks"] {
  const currentPageUrl = normalizeUrlForComparison(page.url);
  const strongLinks = page.relatedInternalLinks
    .filter((link) => normalizeUrlForComparison(link.url) !== currentPageUrl)
    .filter((link) => !looksLikeBlogUrl(link.url))
    .map((link) => ({
      ...link,
      score: getInternalLinkScore(link)
    }))
    .filter((link) => link.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);

  return strongLinks.map(({ text, url }) => ({ text, url }));
}

function getFaqJsonLd(page: ReportPageDetails): string {
  const faqItems = page.faqItems.length
    ? page.faqItems
    : page.faqQuestions.map((question) => ({
        question,
        answer: ""
      }));

  if (faqItems.length === 0) {
    return "No visible FAQs were detected. Do not create FAQPage schema unless visible FAQs are added first.";
  }

  const mainEntity = faqItems.map((item) => ({
    "@type": "Question",
    name: cleanText(item.question),
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
        ? cleanText(item.answer)
        : "Replace this with the exact visible answer from the page."
    }
  }));

  return `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ${JSON.stringify(mainEntity, null, 2)}
}
</script>`;
}

function getWhereToImplement(action: PrioritizedAction, page: ReportPageDetails): string {
  const cleanAction = action.action.toLowerCase();

  if (cleanAction.includes("faqpage schema")) {
    return "WordPress SEO plugin custom schema field, page head, or page-level JSON-LD injection area.";
  }

  if (cleanAction.includes("internal links")) {
    return "Only edit the relevant service sections in the current page content.";
  }

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return "Analyse schema output from the theme, SEO plugin, and page builder first. Do not change anything until approved.";
  }

  if (cleanAction.includes("openinghours") || cleanAction.includes("areaserved")) {
    return "Inside the existing LocalBusiness JSON-LD schema block.";
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    return `Main page content near local proof or trust content for ${cleanText(page.location || "the target location")}.`;
  }

  if (cleanAction.includes("meta wording")) {
    return "WordPress SEO title/meta plugin field or page metadata settings.";
  }

  return "Relevant WordPress page content, SEO plugin field, schema setting, or page template.";
}

function getCodeOrContent(action: PrioritizedAction, page: ReportPageDetails): string {
  const cleanAction = action.action.toLowerCase();

  if (cleanAction.includes("faqpage schema")) {
    return getFaqJsonLd(page);
  }

  if (cleanAction.includes("internal links")) {
    const links = getStrongInternalLinks(page);

    if (links.length === 0) {
      return "Use real existing service/location URLs from the site. Do not invent pages.";
    }

    return [
      "Use these detected service/location URLs only if they are still valid:",
      ...links.map((link) => `- ${cleanText(link.text)}: ${link.url}`),
      "",
      "Preferred anchor examples: laptop repair, Mac repair, data recovery, virus removal."
    ].join("\n");
  }

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return [
      "No code yet.",
      "First list each detected LocalBusiness schema source and any conflicting name, URL, phone, address, openingHours, geo, or areaServed values.",
      "Stop before editing and ask for approval."
    ].join("\n");
  }

  if (cleanAction.includes("openinghours")) {
    return `Example openingHoursSpecification:
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "17:30"
  }
]`;
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    return [
      "Do not write the case study yet.",
      "Business owner must confirm:",
      "- confirmed location",
      "- device type",
      "- problem",
      "- fix completed",
      "- turnaround time",
      "- permission to publish the example"
    ].join("\n");
  }

  if (cleanAction.includes("meta wording")) {
    return "Need computer repair in Ilminster? Get fast, reliable laptop, PC and Mac repairs from Dave at CWC Computers. Call today for friendly local advice.";
  }

  return "No copy-paste content available. Create the smallest practical WordPress change needed for this task.";
}

function getDoNotTouchList(action: PrioritizedAction): string[] {
  const cleanAction = action.action.toLowerCase();
  const items = [
    "Do not work on any other task from this pack.",
    "Do not rewrite the full page.",
    "Do not change scoring logic.",
    "Do not invent facts, reviews, case studies, services, locations, or claims."
  ];

  if (cleanAction.includes("internal links")) {
    items.push("Do not create links to pages that do not exist.");
    items.push("Do not edit unrelated page sections.");
  }

  if (cleanAction.includes("schema")) {
    items.push("Do not remove existing schema until the replacement is confirmed.");
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    items.push("Do not write a case study without business owner confirmation.");
  }

  return items;
}

function getValidationSteps(action: PrioritizedAction): string[] {
  const cleanAction = action.action.toLowerCase();

  if (cleanAction.includes("faqpage schema")) {
    return [
      "Run Google Rich Results Test.",
      "Run Schema.org validator.",
      "Confirm each FAQ schema question and answer matches visible page content."
    ];
  }

  if (cleanAction.includes("internal links")) {
    return [
      "Click each new link and confirm it opens an existing page.",
      "Confirm only relevant page sections were edited.",
      "Check the page still reads naturally."
    ];
  }

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return [
      "List all detected schema blocks and their source if known.",
      "Identify duplicate or conflicting LocalBusiness fields.",
      "Stop and wait for approval before making any change."
    ];
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    return [
      "Confirm the business owner supplied every case study detail.",
      "Check no unconfirmed claim was added.",
      "Stop if any detail is missing."
    ];
  }

  return [
    "Preview the WordPress page.",
    "Check the edited section only.",
    "Confirm no unrelated content changed."
  ];
}

function getStopCondition(action: PrioritizedAction): string {
  const cleanAction = action.action.toLowerCase();

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return "Stop after analysis. Do not edit schema until the business owner approves the plan.";
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    return "Stop if business owner confirmation is missing. Do not draft the case study.";
  }

  return "Stop after completing this one task and summarising exactly what changed.";
}

function formatTask(
  action: PrioritizedAction,
  index: number,
  page: ReportPageDetails
): string {
  return [
    `TASK ${index + 1}`,
    "",
    `Priority: ${priorityLabels[action.priority]}`,
    `Goal: ${cleanText(action.whyItMatters)}`,
    `Exact action: ${cleanText(action.action)}`,
    "",
    "Where to implement:",
    getWhereToImplement(action, page),
    "",
    "Copy-paste code or content if available:",
    getCodeOrContent(action, page),
    "",
    "Do not touch list:",
    ...getDoNotTouchList(action).map((item) => `- ${item}`),
    "",
    "Validation steps:",
    ...getValidationSteps(action).map((step) => `- ${step}`),
    "",
    "Stop condition:",
    getStopCondition(action)
  ].join("\n");
}

function formatBenchmarkContext(benchmark?: BenchmarkCompetitor[]): string {
  if (!benchmark || benchmark.length === 0) {
    return "No competitor benchmark has been added yet.";
  }

  return benchmark
    .map((competitor, index) =>
      [
        `Competitor ${index + 1}`,
        `- URL: ${competitor.url}`,
        `- Title: ${competitor.title ? cleanText(competitor.title) : "Not found"}`,
        `- Word count: ${competitor.wordCount}`,
        `- Headings count: ${competitor.headingsCount}`,
        `- Schema types: ${
          competitor.schemaTypes.length
            ? competitor.schemaTypes.join(", ")
            : "None detected"
        }`,
        `- Trust signals: ${
          competitor.trustSignals.length
            ? competitor.trustSignals.map(cleanText).join(", ")
            : "None detected"
        }`,
        `- Topics/services detected: ${
          competitor.topicsServices.length
            ? competitor.topicsServices.map(cleanText).join(", ")
            : "None detected"
        }`,
        "Target page gaps found:",
        competitor.gapsFound.length
          ? competitor.gapsFound.map((gap) => `- ${cleanText(gap)}`).join("\n")
          : "- None found"
      ].join("\n")
    )
    .join("\n\n");
}

function formatBenchmarkInsightsContext(
  insights?: BenchmarkInsights | null
): string {
  if (!insights) {
    return "No combined competitor insights have been generated yet.";
  }

  return [
    "Combined competitor insights:",
    ...insights.commonPatterns.map((pattern) => `- ${cleanText(pattern)}`),
    "",
    "Majority signals:",
    ...(insights.majoritySignals.length
      ? insights.majoritySignals.map((signal) => `- ${cleanText(signal)}`)
      : ["- None found"]),
    "",
    "Content depth comparison:",
    `- ${cleanText(insights.contentDepthComparison)}`,
    "",
    "Key gaps on target page:",
    ...(insights.keyGaps.length
      ? insights.keyGaps.map((gap) => `- ${cleanText(gap)}`)
      : ["- None found"]),
    "",
    "Priority actions based on competitors:",
    ...(insights.priorityActions.length
      ? insights.priorityActions.map(
          (action, index) => `${index + 1}. ${cleanText(action)}`
        )
      : ["No benchmark-driven priority actions found."])
  ].join("\n");
}

export function generateAiTaskPack({
  page,
  result,
  benchmark,
  benchmarkInsights
}: GenerateAiTaskPackInput): string {
  return [
    "LOCAL SEO AI TASK PACK",
    "",
    "STRICT RULES",
    "- Work on ONE task only.",
    "- Do not explore unrelated WordPress settings.",
    "- Do not make extra changes beyond the task.",
    "- Do not create extra snippets unless required.",
    "- Before making changes, explain the plan.",
    "- After making changes, stop and summarise.",
    "- Do not continue to the next task until approved.",
    "",
    "PAGE CONTEXT",
    `- Target keyword: ${page.keyword ? cleanText(page.keyword) : "Not provided"}`,
    `- Location: ${page.location ? cleanText(page.location) : "Not provided"}`,
    `- URL: ${page.url || "Not provided"}`,
    `- Page title: ${page.title ? cleanText(page.title) : "Not provided"}`,
    `- Meta description: ${page.metaDescription ? cleanText(page.metaDescription) : "Not provided"}`,
    `- Score / grade: ${result.totalScore}/100 (${result.grade})`,
    "",
    "COMPETITOR BENCHMARK CONTEXT",
    formatBenchmarkInsightsContext(benchmarkInsights),
    "",
    formatBenchmarkContext(benchmark),
    "",
    "TASKS",
    result.prioritizedActions.length
      ? result.prioritizedActions
          .map((action, index) => formatTask(action, index, page))
          .join("\n\n---\n\n")
      : "No prioritized actions were generated."
  ].join("\n");
}
