import type { PrioritizedAction, ScoreResult } from "../scoring/types";

export type ReportPageDetails = {
  keyword: string;
  location: string;
  url: string;
  title: string;
  metaDescription: string;
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

export type BenchmarkCompetitor = {
  url: string;
  title: string;
  wordCount: number;
  headingsCount: number;
  schemaTypes: string[];
  trustSignals: string[];
  topicsServices: string[];
  gapsFound: string[];
  fetchReason?: string;
  fetchStatus?: "analysed" | "inaccessible" | "limited";
  insightSource?: "full" | "snippet-only" | "none";
};

export type BenchmarkInsights = {
  targetWordCount: number;
  averageWordCount: number;
  overallCompetitivePosition: string[];
  overallPositionSections: {
    contentDepth: string;
    trustSignals: string;
    serviceCoverage: string;
    summary: string;
  };
  commonPatterns: string[];
  majoritySignals: string[];
  contentDepthComparison: string;
  topicServiceOverlap: string[];
  trustSignalPresence: string[];
  schemaUsage: string[];
  keyGaps: string[];
  topRecommendedNextStep: string;
  priorityActions: string[];
  priorityActionGroups: {
    contentDepth: string[];
    trustSignals: string[];
    serviceCoverage: string[];
    pageStructure: string[];
  };
  summaryRows: Array<{
    name: string;
    url: string;
    wordCount: number;
    headingsCount: number;
    schemaPresence: string;
    trustStrength: "Strong" | "Medium" | "Weak";
  }>;
};

type GenerateReportInput = {
  page: ReportPageDetails;
  result: ScoreResult;
  benchmark?: BenchmarkCompetitor[];
  benchmarkInsights?: BenchmarkInsights | null;
};

const priorityLabels: Record<PrioritizedAction["priority"], string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority"
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

function cleanReportText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function getLocation(page: ReportPageDetails): string {
  return page.location ? cleanReportText(page.location) : "[target location]";
}

function getEstimatedEffort(priority: PrioritizedAction["priority"]): string {
  if (priority === "high") {
    return "1-2 hours";
  }

  if (priority === "medium") {
    return "30-60 minutes";
  }

  return "10-20 minutes";
}

function getImplementationRisk(action: string): "low" | "medium" | "high" {
  const cleanAction = action.toLowerCase();

  if (
    cleanAction.includes("schema") ||
    cleanAction.includes("openinghours") ||
    cleanAction.includes("consolidate")
  ) {
    return "medium";
  }

  if (cleanAction.includes("h1") || cleanAction.includes("title")) {
    return "medium";
  }

  return "low";
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

type InternalLinkRecommendation = {
  confidence: "high" | "medium";
  pageType:
    | "service_page"
    | "location_page"
    | "blog_post"
    | "homepage"
    | "contact_page"
    | "other";
  reason: string;
  rejectedReason?: string;
  text: string;
  topic: string;
  url: string;
};

const serviceTopics = [
  "laptop repair",
  "mac repair",
  "apple mac repair",
  "data recovery",
  "virus removal",
  "computer repair",
  "pc repair",
  "ssd upgrade",
  "screen repair"
];

function classifyInternalUrl(url: string): InternalLinkRecommendation["pageType"] {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.toLowerCase();

    if (path === "/" || path === "") {
      return "homepage";
    }

    if (/(contact|get-in-touch|book|quote)/.test(path)) {
      return "contact_page";
    }

    if (/(blog|news|article|articles|post|posts|category|tag)/.test(path)) {
      return "blog_post";
    }

    if (/(location|areas-we-cover|near-me|chard|ilminster|somerset|yeovil|taunton)/.test(path)) {
      return "location_page";
    }

    if (/(repair|service|recovery|virus|laptop|mac|computer|pc|ssd|screen)/.test(path)) {
      return "service_page";
    }
  } catch {
    if (looksLikeBlogUrl(url)) {
      return "blog_post";
    }
  }

  return "other";
}

function slugToWords(url: string): string {
  try {
    return new URL(url).pathname
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_/]+/g, " ");
  } catch {
    return url.replace(/[-_/]+/g, " ");
  }
}

function extractDestinationTopics(link: { text: string; url: string }): string[] {
  return serviceTopics.filter((topic) =>
    slugToWords(link.url).toLowerCase().includes(topic)
  );
}

function extractAnchorTopics(text: string): string[] {
  const cleanText = text.toLowerCase();

  return serviceTopics.filter((topic) => cleanText.includes(topic));
}

function topicMatches(anchorTopics: string[], destinationTopics: string[]): boolean {
  return anchorTopics.some((anchorTopic) =>
    destinationTopics.some(
      (destinationTopic) =>
        anchorTopic === destinationTopic ||
        anchorTopic.includes(destinationTopic) ||
        destinationTopic.includes(anchorTopic)
    )
  );
}

function getInternalLinkRecommendations(
  page: ReportPageDetails
): {
  highConfidence: InternalLinkRecommendation[];
  mediumConfidence: InternalLinkRecommendation[];
  rejected: InternalLinkRecommendation[];
} {
  const currentPageUrl = normalizeUrlForComparison(page.url);
  const recommendations = page.relatedInternalLinks
    .filter((link) => normalizeUrlForComparison(link.url) !== currentPageUrl)
    .map((link): InternalLinkRecommendation => {
      const pageType = classifyInternalUrl(link.url);
      const anchorTopics = extractAnchorTopics(link.text);
      const destinationTopics = extractDestinationTopics(link);
      const displayTopic =
        destinationTopics[0] ?? anchorTopics[0] ?? cleanReportText(link.text);

      if (
        anchorTopics.length > 0 &&
        pageType === "service_page" &&
        topicMatches(anchorTopics, destinationTopics)
      ) {
        return {
          confidence: "high",
          pageType,
          reason: `High confidence: ${anchorTopics[0]} matches the destination topic.`,
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

      if (
        anchorTopics.length > 0 &&
        (pageType === "blog_post" || pageType === "other") &&
        topicMatches(anchorTopics, destinationTopics)
      ) {
        return {
          confidence: "medium",
          pageType,
          reason:
            "Medium confidence: topic is related, but this is not a dedicated service page.",
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

      if (
        anchorTopics.length > 0 &&
        pageType === "location_page" &&
        topicMatches(anchorTopics, destinationTopics)
      ) {
        return {
          confidence: "medium",
          pageType,
          reason: "Topical match, but location may be less ideal.",
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

      return {
        confidence: "medium",
        pageType,
        reason: "Rejected: topic or page type does not match the service anchor.",
        rejectedReason:
          pageType === "location_page"
            ? "Do not link a service anchor to an unrelated location page."
            : pageType === "blog_post"
              ? "Do not link a service anchor to a generic blog post."
              : "Anchor/topic mismatch or generic destination.",
        text: link.text,
        topic: displayTopic,
        url: link.url
      };
    });

  return {
    highConfidence: recommendations
      .filter((link) => link.confidence === "high" && !link.rejectedReason)
      .slice(0, 5),
    mediumConfidence: recommendations
      .filter((link) => link.confidence === "medium" && !link.rejectedReason)
      .slice(0, 5),
    rejected: recommendations.filter((link) => link.rejectedReason).slice(0, 5)
  };
}

function formatInternalLinkRecommendations(page: ReportPageDetails): string {
  const recommendations = getInternalLinkRecommendations(page);
  const formatLink = (link: InternalLinkRecommendation) =>
    `- ${cleanReportText(link.text)} → ${link.url}\n  Reason: ${link.reason}`;
  const highConfidence =
    recommendations.highConfidence.length > 0
      ? recommendations.highConfidence.map(formatLink).join("\n")
      : "- No suitable high-confidence link found";
  const mediumConfidence =
    recommendations.mediumConfidence.length > 0
      ? recommendations.mediumConfidence
          .map(
            (link) =>
              `${formatLink(link)}\n  Warning: Medium confidence: not a dedicated service page.`
          )
          .join("\n")
      : "- No suitable medium-confidence link found";
  const rejected =
    recommendations.rejected.length > 0
      ? recommendations.rejected
          .map(
            (link) =>
              `- Do not use ${cleanReportText(link.text)} → ${link.url}\n  Reason: ${link.rejectedReason}`
          )
          .join("\n")
      : "- No rejected links to flag";

  if (
    recommendations.highConfidence.length === 0 &&
    recommendations.mediumConfidence.length === 0
  ) {
    return [
      "Recommended internal links:",
      "",
      "High-confidence links",
      "- No suitable link found",
      "",
      "Medium-confidence links",
      "- No suitable link found",
      "",
      "No suitable link found",
      "Do not force an internal link. Create or confirm a dedicated page first.",
      "",
      "Rejected or risky links",
      rejected
    ].join("\n");
  }

  return [
    "Recommended internal links:",
    "",
    "High-confidence links",
    highConfidence,
    "",
    "Medium-confidence links",
    mediumConfidence,
    "",
    "Rejected or risky links",
    rejected
  ].join("\n");
}

function getReportFaqItems(page: ReportPageDetails): Array<{
  question: string;
  answer: string;
}> {
  const faqItems = page.faqItems.length
    ? page.faqItems
    : page.faqQuestions.map((question) => ({
        question,
        answer: ""
      }));

  return faqItems.map((item) => ({
    question: cleanReportText(item.question),
    answer: item.answer
      ? cleanReportText(item.answer)
      : "Replace this with the exact visible answer from the page."
  }));
}

function getAssistantInstructions(): string[] {
  return [
    "INSTRUCTIONS FOR DEVELOPER OR AI ASSISTANT",
    "- Do not review this report generally.",
    "- Convert each task into direct implementation instructions.",
    "- Use only facts visible in the report or supplied by the business owner.",
    "- Do not invent case studies, reviews, locations, services, or claims.",
    '- If information is missing, write: "Business owner must confirm."',
    "- Return copy-paste-ready code or content where possible.",
    "- Keep recommendations practical for WordPress.",
    "",
    "CASE STUDY RULE",
    "- Only include a case study if the business owner confirms it happened.",
    "- Do not invent customer examples, locations, devices, problems, fixes, or turnaround times."
  ];
}

function listItems(
  items: string[],
  emptyText = "- None found"
): string {
  if (items.length === 0) {
    return emptyText;
  }

  return items.map((item) => `- ${cleanReportText(item)}`).join("\n");
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
    const schemaType = schemaMatch?.[1] ?? "schema";

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

function formatBenchmark(benchmark?: BenchmarkCompetitor[]): string {
  if (!benchmark || benchmark.length === 0) {
    return "No competitor benchmark has been added yet.";
  }

  const analysedCount = benchmark.filter(
    (competitor) => competitor.insightSource === "full"
  ).length;
  const limitedNotice =
    analysedCount < 2
      ? [
          "Competitor benchmark is limited because fewer than two competitor pages could be fetched.",
          ""
        ]
      : [];

  return [
    ...limitedNotice,
    benchmark
      .map((competitor, index) => {
        if (competitor.insightSource !== "full") {
          return [
            `Competitor ${index + 1}`,
            `- URL: ${competitor.url}`,
            `- Title: ${competitor.title ? cleanReportText(competitor.title) : "Not found"}`,
            `- Status: ${
              competitor.fetchStatus === "limited"
                ? "Limited fetch"
                : "Inaccessible"
            }`,
            `- Reason: ${
              competitor.fetchReason
                ? cleanReportText(competitor.fetchReason)
                : "Competitor page could not be fully analysed due to fetch restrictions."
            }`,
            competitor.insightSource === "snippet-only"
              ? `- Snippet-only insight: ${
                  competitor.topicsServices.length
                    ? competitor.topicsServices.map(cleanReportText).join(", ")
                    : "No lightweight themes detected from title/snippet"
                }`
              : ""
          ]
            .filter(Boolean)
            .join("\n");
        }

        return [
        `Competitor ${index + 1}`,
        `- URL: ${competitor.url}`,
        `- Title: ${competitor.title ? cleanReportText(competitor.title) : "Not found"}`,
        competitor.fetchStatus === "limited"
          ? `- Status: Limited fetch`
          : "",
        competitor.fetchReason
          ? `- Reason: ${cleanReportText(competitor.fetchReason)}`
          : "",
        `- Word count: ${competitor.wordCount}`,
        `- Headings count: ${competitor.headingsCount}`,
        `- Schema types: ${
          competitor.schemaTypes.length
            ? competitor.schemaTypes.join(", ")
            : "None detected"
        }`,
        `- Trust signals: ${
          competitor.trustSignals.length
            ? competitor.trustSignals.map(cleanReportText).join(", ")
            : "None detected"
        }`,
        `- Topics/services detected: ${
          competitor.topicsServices.length
            ? competitor.topicsServices.map(cleanReportText).join(", ")
            : "None detected"
        }`,
        "Target page gaps found:",
        listItems(
          competitor.gapsFound.map(simplifyBenchmarkGap),
          "- No consistent patterns detected across competitors yet"
        )
      ]
        .filter(Boolean)
        .join("\n");
      })
      .join("\n\n")
  ].join("\n");
}

function formatBenchmarkActionGroups(insights: BenchmarkInsights): string {
  const groups: Array<{ title: string; items: string[] }> = [];

  if (insights.targetWordCount < insights.averageWordCount) {
    groups.push({
      title: "Increase content depth",
      items: [
        `Your page: ${insights.targetWordCount} words`,
        `Competitor average: ${insights.averageWordCount} words`,
        "Add more service detail and local relevance"
      ]
    });
  }

  groups.push(
    {
      title: "Improve trust signals",
      items: [
        "Add testimonials (used by competitors)",
        "Add customer-style review wording",
        "Add independent business messaging",
        "Add family-run or guarantee messaging if accurate"
      ]
    },
    {
      title: "Expand service coverage",
      items: [
        "Add a computer repair section",
        "Add a pc repair section",
        "Consider mac repair and SSD upgrade if relevant"
      ]
    },
    {
      title: "Improve page structure",
      items: [
        "Add more service subheadings",
        "Break content into clearer sections"
      ]
    }
  );

  return groups
    .map((group, index) =>
      [
        `${index + 1}. ${group.title}`,
        ...group.items.map((item) => `- ${item}`)
      ].join("\n")
    )
    .join("\n\n");
}

function formatBenchmarkInsights(insights?: BenchmarkInsights | null): string {
  if (!insights) {
    return "No combined competitor insights have been generated yet.";
  }

  return [
    "Combined Competitor Insights",
    "",
    "Common patterns across competitors:",
    listItems(
      insights.commonPatterns,
      "- No consistent patterns detected across competitors yet"
    ),
    "",
    "Overall competitive position:",
    `- Content depth: ${cleanReportText(insights.overallPositionSections.contentDepth)}`,
    `- Trust signals: ${cleanReportText(insights.overallPositionSections.trustSignals)}`,
    `- Service coverage: ${cleanReportText(insights.overallPositionSections.serviceCoverage)}`,
    `- Summary: ${cleanReportText(insights.overallPositionSections.summary)}`,
    "",
    "Majority signals:",
    listItems(
      insights.majoritySignals,
      "- Not enough competitor overlap to identify strong patterns yet"
    ),
    "",
    "Content depth comparison:",
    `- ${cleanReportText(insights.contentDepthComparison)}`,
    "",
    "Topic/service overlap:",
    listItems(insights.topicServiceOverlap),
    "",
    "Trust signal presence:",
    listItems(insights.trustSignalPresence),
    "",
    "Schema usage:",
    listItems(insights.schemaUsage),
    "",
    "Key gaps on your page:",
    listItems(
      insights.keyGaps,
      "- No consistent patterns detected across competitors yet"
    ),
    "",
    "Top recommended next step:",
    `- ${cleanReportText(insights.topRecommendedNextStep)}`,
    "",
    "Priority actions based on competitors:",
    "Recommended improvements are based on competitor comparison. Focus on the top action first for the fastest impact.",
    "",
    formatBenchmarkActionGroups(insights),
    "",
    "Competitor summary table:",
    insights.summaryRows.length
      ? insights.summaryRows
          .map(
            (row) =>
              `- ${cleanReportText(row.name)} | Words: ${row.wordCount} | Headings: ${row.headingsCount} | Schema: ${row.schemaPresence} | Trust: ${row.trustStrength} | ${row.url}`
          )
          .join("\n")
      : "- No competitor rows found"
  ].join("\n");
}

function getDoNotChangeItems(result: ScoreResult): string[] {
  const items: string[] = [];

  if (
    result.strengths.some((strength) => strength.toLowerCase().includes("title"))
  ) {
    items.push("Page title already contains useful target keyword relevance.");
  }

  if (result.signals.headings.h1.length > 0) {
    items.push(
      `H1 is already present: ${cleanReportText(result.signals.headings.h1[0])}`
    );
  }

  if (result.signals.headings.h2.length > 0) {
    items.push(
      "Existing service sections/headings are useful. Improve them rather than replacing them."
    );
  }

  if (result.signals.hasPhoneNumber || result.signals.ctaWords.length > 0) {
    items.push(
      "Phone number and/or call-to-action placement is already detected."
    );
  }

  if (result.signals.trustSignals.length > 0) {
    items.push(
      `Existing review/trust content is useful: ${result.signals.trustSignals.join(", ")}.`
    );
  }

  if (items.length === 0) {
    items.push(
      "Keep any accurate business details, service copy, phone numbers, and existing trust content that are already on the page."
    );
  }

  return items;
}

function getTaskDetails(
  action: PrioritizedAction,
  page: ReportPageDetails
): {
  whereToImplement: string;
  whatToChange: string;
  example: string;
  expectedOutcome: string;
} {
  const cleanAction = action.action.toLowerCase();
  const location = getLocation(page);

  if (cleanAction.includes("faqpage schema")) {
    if (page.faqQuestions.length === 0) {
      return {
        whereToImplement:
          "Do not implement FAQPage schema yet.",
        whatToChange:
          "No visible FAQs were detected, so do not add FAQPage schema unless FAQs are added to the page.",
        example:
          "First add visible FAQ questions and answers to the page. Then add matching FAQPage JSON-LD.",
        expectedOutcome:
          "FAQPage schema is only added when it matches visible page content."
      };
    }

    const faqItems = getReportFaqItems(page);

    return {
      whereToImplement:
        "WordPress SEO plugin custom schema field, theme page head, or page-level JSON-LD injection area.",
      whatToChange:
        "Add JSON-LD FAQPage schema that matches the FAQ content already visible on the page.",
      example: `Example JSON-LD:
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ${JSON.stringify(
    faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    })),
    null,
    2
  )}
}
</script>`,
      expectedOutcome:
        "Search engines can understand the visible FAQ content as structured question-and-answer information."
    };
  }

  if (cleanAction.includes("internal links")) {
    return {
      whereToImplement:
        "Inside relevant service sections in the main page content.",
      whatToChange:
        "Add only contextually relevant internal links where the anchor topic matches the destination topic.",
      example: formatInternalLinkRecommendations(page),
      expectedOutcome:
        "Visitors and search engines can move more easily between related service pages."
    };
  }

  if (cleanAction.includes("areaServed".toLowerCase())) {
    return {
      whereToImplement:
        "Inside the LocalBusiness JSON-LD schema block.",
      whatToChange:
        "Add areaServed using the target town and nearby service area.",
      example: `Example areaServed:
"areaServed": [
  "${location}",
  "nearby towns and villages"
]`,
      expectedOutcome:
        "The LocalBusiness schema clearly states the local area the business serves."
    };
  }

  if (
    cleanAction.includes("schema blocks") ||
    cleanAction.includes("consolidate")
  ) {
    return {
      whereToImplement:
        "Existing JSON-LD schema output in the SEO plugin, theme, or page template.",
      whatToChange:
        "Keep one primary LocalBusiness schema block. Remove duplicate/conflicting LocalBusiness blocks from the theme, SEO plugin, or page builder.",
      example:
        "Keep the version with name, address, telephone, URL, openingHours, geo, and areaServed. Ensure phone/address match visible page content.",
      expectedOutcome:
        "Structured data is clearer, easier to validate, and less likely to contain conflicting business details."
    };
  }

  if (cleanAction.includes("openinghours")) {
    return {
      whereToImplement:
        "Inside the LocalBusiness JSON-LD schema block.",
      whatToChange:
        "Add openingHoursSpecification with the correct opening days and times.",
      example: `Example openingHoursSpecification:
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "17:30"
  }
]`,
      expectedOutcome:
        "The LocalBusiness schema gives clearer business availability information."
    };
  }

  if (
    cleanAction.includes("case study") ||
    cleanAction.includes("example job")
  ) {
    return {
      whereToImplement:
        "Add a short section in the main content, near service details or trust content.",
      whatToChange:
        "Only add a case study if the business owner confirms the job really happened. If any detail is missing, write: \"Business owner must confirm.\"",
      example: `Case study confirmation fields:
- confirmed location: Business owner must confirm.
- device type: Business owner must confirm.
- problem: Business owner must confirm.
- fix completed: Business owner must confirm.
- turnaround time: Business owner must confirm.
- business owner confirmation required: Yes.

Copy template after confirmation:
Recent ${location} repair example: A customer in [confirmed location] had [confirmed problem] on their [confirmed device type]. We completed [confirmed fix]. The device was returned in [confirmed turnaround time].`,
      expectedOutcome:
        "The page gains unique local proof only when the business owner has confirmed the details are true."
    };
  }

  if (cleanAction.includes("meta wording")) {
    const location = getLocation(page);

    return {
      whereToImplement:
        "SEO title/meta plugin field or page metadata settings.",
      whatToChange:
        "Rewrite the meta description to include the service, location, benefit, and call to action.",
      example:
        `Example meta description:\nNeed computer repair in ${location}? Get fast, reliable laptop, PC and Mac repairs from Dave at CWC Computers. Call today for friendly local advice.`,
      expectedOutcome:
        "The search result snippet becomes clearer and more likely to earn clicks."
    };
  }

  return {
    whereToImplement:
      "Relevant page content, SEO plugin, schema settings, or page template.",
    whatToChange: action.action,
    example:
      "Use the existing page style and add the smallest clear change needed to complete this task.",
    expectedOutcome: action.whyItMatters
  };
}

function formatTasks(
  actions: PrioritizedAction[],
  priority: PrioritizedAction["priority"],
  page: ReportPageDetails
): string {
  const filteredActions = actions.filter(
    (action) => action.priority === priority
  );

  if (filteredActions.length === 0) {
    return `${priorityLabels[priority]}\n\nNo tasks in this group.`;
  }

  return [
    priorityLabels[priority],
    ...filteredActions.map((action, index) => {
      const details = getTaskDetails(action, page);

      return [
        `Task ${index + 1}`,
        "",
        "Task:",
        cleanReportText(action.action),
        "",
        "Where to implement:",
        cleanReportText(details.whereToImplement),
        "",
        "What to change:",
        cleanReportText(details.whatToChange),
        "",
        "Example code or copy:",
        details.example,
        "",
        "Expected outcome:",
        cleanReportText(details.expectedOutcome),
        "",
        "estimatedEffort:",
        getEstimatedEffort(action.priority),
        "",
        "implementationRisk:",
        getImplementationRisk(action.action),
        "",
        "Estimated score gain:",
        `+${action.estimatedScoreGain}`
      ].join("\n");
    })
  ].join("\n\n");
}

export function generateDeveloperReport({
  page,
  result,
  benchmark,
  benchmarkInsights
}: GenerateReportInput): string {
  return [
    "LOCAL SEO DEVELOPER TASK SHEET",
    "",
    ...getAssistantInstructions(),
    "",
    "PAGE DETAILS",
    `- Target keyword: ${page.keyword ? cleanReportText(page.keyword) : "Not provided"}`,
    `- Location: ${page.location ? cleanReportText(page.location) : "Not provided"}`,
    `- URL: ${page.url || "Not provided"}`,
    `- Page title: ${page.title ? cleanReportText(page.title) : "Not provided"}`,
    `- Meta description: ${page.metaDescription ? cleanReportText(page.metaDescription) : "Not provided"}`,
    `- Score / grade: ${result.totalScore}/100 (${result.grade})`,
    "",
    "DO NOT CHANGE",
    listItems(getDoNotChangeItems(result)),
    "",
    "COMPETITOR BENCHMARK",
    formatBenchmarkInsights(benchmarkInsights),
    "",
    formatBenchmark(benchmark),
    "",
    "TASKS FOR DEVELOPER",
    formatTasks(result.prioritizedActions, "high", page),
    "",
    formatTasks(result.prioritizedActions, "medium", page),
    "",
    formatTasks(result.prioritizedActions, "low", page),
    "",
    "DEVELOPER QA CHECKLIST",
    "- Run Google Rich Results Test",
    "- Validate JSON-LD",
    "- Check page still has one H1",
    "- Check phone links still work",
    "- Check page loads correctly on mobile",
    "- Check no duplicate/conflicting LocalBusiness schema remains"
  ].join("\n");
}
