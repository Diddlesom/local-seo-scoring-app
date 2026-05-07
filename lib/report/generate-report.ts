import type {
  IntentMode,
  PrioritizedAction,
  ScoreResult
} from "../scoring/types";

export type ReportPageDetails = {
  intentMode?: IntentMode;
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
  intentMode?: IntentMode;
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

const intentModeLabels: Record<IntentMode, string> = {
  "local-seo": "Local SEO",
  affiliate: "Affiliate",
  saas: "SaaS",
  "blog-media": "Blog / Media"
};

function getIntentModeLabel(mode?: IntentMode): string {
  return intentModeLabels[mode ?? "local-seo"];
}

function getReportTitle(mode?: IntentMode): string {
  if (mode === "blog-media") {
    return "BLOG / MEDIA DEVELOPER TASK SHEET";
  }

  if (mode === "affiliate") {
    return "AFFILIATE CONTENT DEVELOPER TASK SHEET";
  }

  if (mode === "saas") {
    return "SAAS CONTENT DEVELOPER TASK SHEET";
  }

  return "LOCAL SEO DEVELOPER TASK SHEET";
}

function getIntentModeNotice(mode?: IntentMode): string {
  return mode && mode !== "local-seo"
    ? "This mode is in early support. Recommendations are adjusted lightly but full scoring is still being developed."
    : "";
}

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

type InternalLinkRecommendationGroups = {
  highConfidence: InternalLinkRecommendation[];
  mediumConfidence: InternalLinkRecommendation[];
  rejected: InternalLinkRecommendation[];
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

const blogMediaInternalTopics = [
  "fix",
  "slow",
  "computer",
  "pc",
  "ssd upgrade",
  "ssd upgrades",
  "malware removal",
  "malware",
  "safe",
  "common problems",
  "common-problems",
  "remotely",
  "overheating",
  "slow startup",
  "slow boot",
  "startup programs",
  "browser performance",
  "browser tabs",
  "guide",
  "windows",
  "remote repair",
  "remote",
  "repair",
  "troubleshooting",
  "checklist",
  "windows updates",
  "ram usage",
  "hard drive failure",
  "antivirus scans"
];

const affiliateInternalTopics = [
  "product review",
  "product reviews",
  "review",
  "reviews",
  "best",
  "best-of",
  "roundup",
  "comparison",
  "compare",
  "vs",
  "versus",
  "buying guide",
  "buyer guide",
  "buyers guide",
  "how-to buyer guide",
  "alternatives",
  "product",
  "products",
  "pricing",
  "price",
  "deal",
  "discount",
  "value"
];

const saasInternalTopics = [
  "feature",
  "features",
  "use case",
  "use-case",
  "use cases",
  "pricing",
  "demo",
  "free trial",
  "trial",
  "signup",
  "sign-up",
  "integrations",
  "integration",
  "docs",
  "documentation",
  "help center",
  "help centre",
  "support",
  "comparison",
  "compare",
  "alternatives",
  "security",
  "api",
  "customers",
  "case study"
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

function getInternalLinkTopics(mode?: IntentMode): string[] {
  if (mode === "blog-media") {
    return blogMediaInternalTopics;
  }

  if (mode === "affiliate") {
    return affiliateInternalTopics;
  }

  if (mode === "saas") {
    return saasInternalTopics;
  }

  return serviceTopics;
}

function extractDestinationTopics(
  link: { text: string; url: string },
  mode?: IntentMode
): string[] {
  const comparable = `${slugToWords(link.url)} ${link.text}`.toLowerCase();

  return getInternalLinkTopics(mode).filter((topic) =>
    comparable.includes(topic)
  );
}

function extractAnchorTopics(text: string, mode?: IntentMode): string[] {
  const cleanText = text.toLowerCase();

  return getInternalLinkTopics(mode).filter((topic) => cleanText.includes(topic));
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
): InternalLinkRecommendationGroups {
  const isBlogMedia = page.intentMode === "blog-media";
  const isAffiliate = page.intentMode === "affiliate";
  const isSaas = page.intentMode === "saas";
  const currentPageUrl = normalizeUrlForComparison(page.url);
  const recommendations = page.relatedInternalLinks
    .filter((link) => normalizeUrlForComparison(link.url) !== currentPageUrl)
    .map((link): InternalLinkRecommendation => {
      const pageType = classifyInternalUrl(link.url);
      const anchorTopics = extractAnchorTopics(link.text, page.intentMode);
      const destinationTopics = extractDestinationTopics(link, page.intentMode);
      const displayTopic =
        destinationTopics[0] ?? anchorTopics[0] ?? cleanReportText(link.text);

      if (isBlogMedia) {
        if (
          destinationTopics.length > 0 &&
          (pageType === "blog_post" || pageType === "other")
        ) {
          return {
            confidence: "high",
            pageType,
            reason: `High confidence: informational content matches ${destinationTopics[0]}.`,
            text: link.text,
            topic: displayTopic,
            url: link.url
          };
        }

        if (destinationTopics.length > 0 && pageType === "service_page") {
          return {
            confidence: "medium",
            pageType,
            reason:
              "Medium confidence: topically related, but this appears to be a service page rather than supporting editorial content.",
            text: link.text,
            topic: displayTopic,
            url: link.url
          };
        }

        return {
          confidence: "medium",
          pageType,
          reason:
            "Rejected: Blog/Media mode should link to informational or strongly related supporting content.",
          rejectedReason:
            pageType === "location_page"
              ? "Avoid generic town, service area, or local landing pages unless the article topic strongly matches."
              : pageType === "service_page"
                ? "Avoid service pages with weak editorial relevance."
                : "No clear informational topic match.",
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

      if (isAffiliate) {
        if (
          destinationTopics.length > 0 &&
          (pageType === "blog_post" || pageType === "other")
        ) {
          return {
            confidence: "high",
            pageType,
            reason: `High confidence: affiliate buyer-intent content matches ${destinationTopics[0]}.`,
            text: link.text,
            topic: displayTopic,
            url: link.url
          };
        }

        if (destinationTopics.length > 0 && pageType === "service_page") {
          return {
            confidence: "medium",
            pageType,
            reason:
              "Medium confidence: topical match, but confirm this is a review, comparison, roundup, or buying guide rather than a local service page.",
            text: link.text,
            topic: displayTopic,
            url: link.url
          };
        }

        return {
          confidence: "medium",
          pageType,
          reason:
            "Rejected: Affiliate mode should link to product reviews, best-of roundups, comparison articles, or buying guides.",
          rejectedReason:
            pageType === "location_page"
              ? "Avoid location pages for Affiliate mode unless the page is genuinely a buyer guide with matching product intent."
              : pageType === "service_page"
                ? "Avoid local service pages with weak buyer-intent relevance."
                : "No clear affiliate buyer-intent topic match.",
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

      if (isSaas) {
        if (
          destinationTopics.length > 0 &&
          pageType !== "location_page" &&
          pageType !== "contact_page"
        ) {
          return {
            confidence: "high",
            pageType,
            reason: `High confidence: SaaS product/use-case content matches ${destinationTopics[0]}.`,
            text: link.text,
            topic: displayTopic,
            url: link.url
          };
        }

        return {
          confidence: "medium",
          pageType,
          reason:
            "Rejected: SaaS mode should link to features, use cases, pricing, integrations, docs, comparisons, alternatives, demo, trial, or signup pages.",
          rejectedReason:
            pageType === "location_page"
              ? "Avoid location pages for SaaS mode unless the page genuinely supports the product/use-case topic."
              : "No clear SaaS product/use-case topic match.",
          text: link.text,
          topic: displayTopic,
          url: link.url
        };
      }

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

function hasRelevantEditorialInternalLinks(
  recommendations: InternalLinkRecommendationGroups
): boolean {
  return (
    recommendations.highConfidence.length + recommendations.mediumConfidence.length >=
    2
  );
}

function formatInternalLinkRecommendations(page: ReportPageDetails): string {
  const recommendations = getInternalLinkRecommendations(page);
  const isBlogMedia = page.intentMode === "blog-media";
  const isAffiliate = page.intentMode === "affiliate";
  const isSaas = page.intentMode === "saas";
  const formatLink = (link: InternalLinkRecommendation) =>
    `- ${cleanReportText(link.text)} → ${link.url}\n  Reason: ${link.reason}`;

  if (
    (isBlogMedia || isAffiliate || isSaas) &&
    hasRelevantEditorialInternalLinks(recommendations)
  ) {
    return [
      isAffiliate
        ? "Relevant affiliate internal links already present."
        : isSaas
          ? "Relevant SaaS internal links already present."
        : "Relevant editorial internal links already present.",
      "",
      "Detected relevant internal links",
      ...recommendations.highConfidence.map(formatLink),
      ...recommendations.mediumConfidence.map(formatLink),
      "",
      "Rejected or risky links",
      recommendations.rejected.length > 0
        ? recommendations.rejected
            .map(
              (link) =>
                `- Do not use ${cleanReportText(link.text)} → ${link.url}\n  Reason: ${link.rejectedReason}`
            )
            .join("\n")
        : "- No rejected links to flag"
    ].join("\n");
  }

  const highConfidence =
    recommendations.highConfidence.length > 0
      ? recommendations.highConfidence.map(formatLink).join("\n")
      : "- No suitable high-confidence link found";
  const mediumConfidence =
    recommendations.mediumConfidence.length > 0
      ? recommendations.mediumConfidence
          .map(
            (link) =>
              `${formatLink(link)}\n  Warning: ${
                isBlogMedia
                  ? "Medium confidence: useful topic match, but check it supports the article intent."
                  : isAffiliate
                    ? "Medium confidence: useful buyer-intent topic match, but check it is not an unrelated local page."
                    : isSaas
                      ? "Medium confidence: useful product/use-case topic match, but check it supports the SaaS evaluation journey."
                  : "Medium confidence: not a dedicated service page."
              }`
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
      isBlogMedia
        ? "Do not force an internal link. Create or confirm a relevant guide, checklist, or supporting article first."
        : isAffiliate
          ? "Do not force an internal link. Create or confirm a relevant review, comparison, roundup, or buying guide first."
          : isSaas
            ? "Do not force an internal link. Create or confirm a real feature, pricing, integration, docs, comparison, alternatives, demo, trial, signup, or use-case page first."
        : "Do not force an internal link. Create or confirm a dedicated page first.",
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

function formatExistingEditorialInternalLinks(page: ReportPageDetails): string {
  if (
    page.intentMode !== "blog-media" &&
    page.intentMode !== "affiliate" &&
    page.intentMode !== "saas"
  ) {
    return "";
  }

  const recommendations = getInternalLinkRecommendations(page);

  if (!hasRelevantEditorialInternalLinks(recommendations)) {
    return "";
  }

  const formatLink = (link: InternalLinkRecommendation) =>
    `- ${cleanReportText(link.text)} → ${link.url}\n  Reason: ${link.reason}`;

  return [
    "INTERNAL LINK STATUS",
    page.intentMode === "affiliate"
      ? "Relevant affiliate internal links already present."
      : page.intentMode === "saas"
        ? "Relevant SaaS internal links already present."
      : "Relevant editorial internal links already present.",
    "",
    "Detected relevant internal links",
    ...recommendations.highConfidence.map(formatLink),
    ...recommendations.mediumConfidence.map(formatLink)
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

function getAssistantInstructions(mode?: IntentMode): string[] {
  const instructions = [
    "INSTRUCTIONS FOR DEVELOPER OR AI ASSISTANT",
    "- Do not review this report generally.",
    "- Convert each task into direct implementation instructions.",
    "- Use only facts visible in the report or supplied by the business owner.",
    "- Do not invent case studies, reviews, locations, services, or claims.",
    '- If information is missing, write: "Business owner must confirm."',
    "- Return copy-paste-ready code or content where possible.",
    "- Keep recommendations practical for WordPress."
  ];

  if (mode === "saas") {
    instructions.push(
      "",
      "CASE STUDY / TESTIMONIAL RULE",
      "- Only include testimonials, case studies, customer names, metrics, or outcomes if the business owner confirms they are real.",
      "- Do not invent customers, results, screenshots, integrations, compliance claims, or security certifications."
    );
  } else {
    instructions.push(
      "",
      "CASE STUDY RULE",
      "- Only include a case study if the business owner confirms it happened.",
      "- Do not invent customer examples, locations, devices, problems, fixes, or turnaround times."
    );
  }

  return instructions;
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

function simplifyBenchmarkGap(gap: string, mode?: IntentMode): string {
  const cleanGap = gap.toLowerCase();

  if (cleanGap.includes("deeper page content")) {
    return "One competitor has deeper content";
  }

  if (cleanGap.includes("buyer sections")) {
    return "Fewer buyer sections than competitors";
  }

  if (cleanGap.includes("more headings")) {
    if (mode === "saas") {
      return "Fewer product/use-case subheadings than competitors";
    }

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

    if (mode === "saas" && isSaasTrustLikeGap(trustSignal)) {
      return `Missing ${trustSignal}`;
    }

    return `Missing ${trustSignal} (used by competitors)`;
  }

  if (cleanGap.includes("buyer-intent coverage for")) {
    const topicMatch = gap.match(/for (.*?) because/i);
    const topic = topicMatch?.[1] ?? "buyer intent";

    return `Missing ${topic} coverage`;
  }

  if (cleanGap.includes("product/use-case coverage for")) {
    const topicMatch = gap.match(/for (.*?) because/i);
    const topic = topicMatch?.[1] ?? "product/use-case";

    if (mode === "saas" && isSaasTrustLikeGap(topic)) {
      return `Missing ${topic}`;
    }

    return `Missing ${topic} coverage`;
  }

  if (cleanGap.includes("short section for")) {
    const topicMatch = gap.match(/for (.*?) because/i);
    const topic = topicMatch?.[1] ?? "service coverage";

    return `Missing ${topic} coverage`;
  }

  return gap;
}

function isSaasTrustLikeGap(value: string): boolean {
  return /\b(?:testimonial|case stud|security|compliance|trust|faq)\b/i.test(
    value
  );
}

function formatBenchmark(
  benchmark?: BenchmarkCompetitor[],
  mode?: IntentMode
): string {
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
        `- ${
          mode === "affiliate"
            ? "Products/buyer topics detected"
            : mode === "saas"
              ? "Products/use cases detected"
              : mode === "blog-media"
                ? "Topics/entities detected"
                : "Topics/services detected"
        }: ${
          competitor.topicsServices.length
            ? competitor.topicsServices.map(cleanReportText).join(", ")
            : "None detected"
        }`,
        "Target page gaps found:",
        listItems(
          competitor.gapsFound.map((gap) => simplifyBenchmarkGap(gap, mode)),
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
  const isBlogMedia = insights.intentMode === "blog-media";
  const isAffiliate = insights.intentMode === "affiliate";
  const isSaas = insights.intentMode === "saas";
  const groups: Array<{ title: string; items: string[] }> = [];

  if (insights.targetWordCount < insights.averageWordCount) {
    groups.push({
      title: "Increase content depth",
      items: [
        `Your page: ${insights.targetWordCount} words`,
        `Competitor average: ${insights.averageWordCount} words`,
        isBlogMedia
          ? "Add more semantic depth, examples, and practical editorial detail"
          : isAffiliate
            ? "Add more buyer detail, comparison criteria, and product decision support"
            : isSaas
              ? "Add more product detail, use cases, feature depth, and SaaS evaluation support"
          : "Add more service detail and local relevance"
      ]
    });
  }

  groups.push(
    {
      title: "Improve trust signals",
      items: insights.priorityActionGroups.trustSignals
    },
    {
      title: isBlogMedia
        ? "Expand topic coverage"
        : isAffiliate
          ? "Expand buyer intent coverage"
          : isSaas
            ? "Expand product/use-case coverage"
          : "Expand service coverage",
      items: insights.priorityActionGroups.serviceCoverage
    },
    {
      title: "Improve page structure",
      items: insights.priorityActionGroups.pageStructure
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

  const isBlogMedia = insights.intentMode === "blog-media";
  const isAffiliate = insights.intentMode === "affiliate";
  const isSaas = insights.intentMode === "saas";
  const coverageLabel = isBlogMedia
    ? "Topic coverage"
    : isAffiliate
      ? "Buyer intent coverage"
      : isSaas
        ? "Product/use-case coverage"
      : "Service coverage";
  const overlapLabel = isBlogMedia
    ? "Topic/entity overlap:"
    : isAffiliate
      ? "Product/entity overlap:"
      : isSaas
        ? "Product/entity overlap:"
      : "Topic/service overlap:";

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
    `- ${coverageLabel}: ${cleanReportText(insights.overallPositionSections.serviceCoverage)}`,
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
    overlapLabel,
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

function getDoNotChangeItems(
  result: ScoreResult,
  mode?: IntentMode
): string[] {
  const isBlogMedia = mode === "blog-media";
  const isAffiliate = mode === "affiliate";
  const isSaas = mode === "saas";
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
      isBlogMedia
        ? "Existing article sections/headings are useful. Improve them rather than replacing them."
        : isAffiliate
          ? "Existing buyer sections/headings are useful. Improve them rather than replacing them."
          : isSaas
            ? "Existing product sections/headings are useful. Improve them rather than replacing them."
        : "Existing service sections/headings are useful. Improve them rather than replacing them."
    );
  }

  if (
    !isAffiliate &&
    !isSaas &&
    (result.signals.hasPhoneNumber || result.signals.ctaWords.length > 0)
  ) {
    items.push(
      "Phone number and/or call-to-action placement is already detected."
    );
  }

  if (result.signals.trustSignals.length > 0) {
    items.push(
      isAffiliate
        ? `Existing affiliate trust signals are useful: ${result.signals.trustSignals.join(", ")}.`
        : isSaas
          ? `Existing SaaS trust signals are useful: ${result.signals.trustSignals.join(", ")}.`
        : `Existing review/trust content is useful: ${result.signals.trustSignals.join(", ")}.`
    );
  }

  if (items.length === 0) {
    items.push(
      isAffiliate
        ? "Keep any accurate product details, affiliate disclosure, reviewer notes, and buyer guidance that are already on the page."
        : isSaas
          ? "Keep any accurate product details, feature copy, use-case copy, CTAs, proof, screenshots, and SaaS trust content that are already on the page."
        : "Keep any accurate business details, service copy, phone numbers, and existing trust content that are already on the page."
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
  const targetKeyword = page.keyword
    ? cleanReportText(page.keyword)
    : "Best Cordless Vacuum Cleaners";

  if (
    page.intentMode === "affiliate" &&
    cleanAction.includes("page title")
  ) {
    return {
      whereToImplement:
        "SEO title field, page title, or article title setting.",
      whatToChange:
        "Rewrite the title so the buyer-intent topic is clear and useful. Keep it accurate to the products actually reviewed.",
      example:
        `Example title: Best ${targetKeyword.replace(/^best\s+/i, "")} Tested & Reviewed`,
      expectedOutcome:
        "Readers and search engines can quickly understand the affiliate review or buying-guide topic."
    };
  }

  if (page.intentMode === "saas" && cleanAction.includes("page title")) {
    const isComparisonTask = /\b(?:comparison|compare|review|alternative|alternatives)\b/i.test(
      `${cleanAction} ${page.keyword} ${page.title}`
    );

    return {
      whereToImplement:
        "SEO title field, page title, or product page title setting.",
      whatToChange:
        isComparisonTask
          ? "Rewrite the title so the SaaS comparison angle and target use case are clear."
          : "Rewrite the title so the SaaS product topic, product category, or use case is clear.",
      example:
        isComparisonTask
          ? `Example title: Best ${targetKeyword.replace(/^best\s+/i, "")} Compared for Growing Teams`
          : `Example title: ${targetKeyword} Software for Growing Teams`,
      expectedOutcome:
        isComparisonTask
          ? "Readers and search engines can quickly understand the SaaS comparison promise."
          : "Readers and search engines can quickly understand the SaaS product and use-case promise."
    };
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("product, review") ||
      cleanAction.includes("itemlist") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("review schema"))
  ) {
    return {
      whereToImplement:
        "SEO plugin custom schema field, page head, or page-level JSON-LD injection area.",
      whatToChange:
        "Add Product, Review, or ItemList schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      example:
        "Use Product schema for a single reviewed product, Review schema for real review content, and ItemList schema for ranked roundups. Do not add FAQPage schema unless visible FAQ questions and answers exist on the page.",
      expectedOutcome:
        "Structured data supports affiliate buyer content without using LocalBusiness or location schema."
    };
  }

  if (
    page.intentMode === "saas" &&
    (cleanAction.includes("softwareapplication") ||
      cleanAction.includes("article") ||
      cleanAction.includes("itemlist") ||
      cleanAction.includes("organization") ||
      cleanAction.includes("breadcrumblist") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("faqpage schema"))
  ) {
    return {
      whereToImplement:
        "SEO plugin custom schema field, page head, or page-level JSON-LD injection area.",
      whatToChange:
        cleanAction.includes("article") || cleanAction.includes("itemlist")
          ? "Add Article, ItemList, Product, or FAQPage schema where appropriate. Only add FAQPage schema if visible FAQs are added first."
          : "Add SoftwareApplication, Product, Organization, BreadcrumbList, or FAQPage schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      example:
        cleanAction.includes("article") || cleanAction.includes("itemlist")
          ? "Use Article schema for the comparison article, ItemList schema for ranked lists, Product schema where product fields are visible, and FAQPage only for visible FAQ questions and answers."
          : "Use SoftwareApplication schema for the SaaS product, Product schema where product fields are visible, Organization schema for the company, BreadcrumbList for navigation, and FAQPage only for visible FAQ questions and answers.",
      expectedOutcome:
        "Structured data supports SaaS product content without using LocalBusiness or location schema."
    };
  }

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
    const isBlogMedia = page.intentMode === "blog-media";
    const isAffiliate = page.intentMode === "affiliate";
    const isSaas = page.intentMode === "saas";

    return {
      whereToImplement:
        isBlogMedia
          ? "Inside relevant article sections in the main page content."
          : isAffiliate
            ? "Inside relevant buyer sections in the main page content."
            : isSaas
              ? "Inside relevant product sections in the main page content."
          : "Inside relevant service sections in the main page content.",
      whatToChange:
        isBlogMedia
          ? "Add only contextually relevant internal links to supporting articles, guides, checklists, or explainers where the topic matches the article section."
          : isAffiliate
            ? "Add only contextually relevant internal links to product reviews, best-of roundups, comparison articles, or buying guides where the topic matches the buyer section."
            : isSaas
              ? "Add only contextually relevant internal links to feature, pricing, integration, docs/help, comparison, alternatives, demo/trial/signup, or use-case pages where the topic matches the product section."
          : "Add only contextually relevant internal links where the anchor topic matches the destination topic.",
      example: formatInternalLinkRecommendations(page),
      expectedOutcome:
        isBlogMedia
          ? "Readers and search engines can move more easily between related editorial topic-cluster content."
          : isAffiliate
            ? "Readers and search engines can move more easily between related buyer-intent reviews, comparisons, and guides."
            : isSaas
              ? "Prospects and search engines can move more easily between related SaaS product, feature, use-case, and conversion pages."
          : "Visitors and search engines can move more easily between related service pages."
    };
  }

  if (
    page.intentMode === "saas" &&
    (cleanAction.includes("product positioning") ||
      cleanAction.includes("comparison angle") ||
      cleanAction.includes("feature") ||
      cleanAction.includes("use-case") ||
      cleanAction.includes("use case") ||
      cleanAction.includes("integrations") ||
      cleanAction.includes("comparison") ||
      cleanAction.includes("visuals") ||
      cleanAction.includes("screenshots") ||
      cleanAction.includes("pricing") ||
      cleanAction.includes("demo") ||
      cleanAction.includes("trial") ||
      cleanAction.includes("signup"))
  ) {
    const isComparisonTask = /\b(?:comparison|compared|compare|best-fit|best fit|each tool|each saas|pros and cons)\b/i.test(cleanAction);

    return {
      whereToImplement:
        isComparisonTask
          ? "Inside the main SaaS comparison/review content, near the tool recommendations or comparison section."
          : "Inside the main SaaS product content, near the relevant product, feature, use-case, pricing, integration, or CTA section.",
      whatToChange:
        isComparisonTask
          ? "Clarify the comparison angle, comparison criteria, and who each tool is best for."
          : "Add clear product sections that explain what the SaaS product does, who it helps, why it matters, and what the next step is.",
      example:
        isComparisonTask
          ? "Example comparison section labels: Comparison table, Best for, Key features compared, Pricing/free trial comparison, Integrations compared, Setup/onboarding notes, Pros and cons, FAQs."
          : "Example product section labels: Key features, Use cases, Integrations, Pricing and trial, Product screenshots, Compare alternatives.",
      expectedOutcome:
        isComparisonTask
          ? "The page gives clearer SaaS comparison guidance without drifting into affiliate disclosure or Amazon-style review wording."
          : "The page gives clearer product-led SEO coverage without adding local SEO or affiliate roundup wording."
    };
  }

  if (
    page.intentMode === "saas" &&
    (cleanAction.includes("testimonials") ||
      cleanAction.includes("case studies") ||
      cleanAction.includes("security") ||
      cleanAction.includes("compliance"))
  ) {
    return {
      whereToImplement:
        "Near the relevant trust, customer proof, security, compliance, or product evaluation section.",
      whatToChange:
        "Add only accurate SaaS trust wording. Do not invent customers, metrics, outcomes, screenshots, integrations, compliance claims, or security certifications.",
      example:
        "Business owner must confirm any testimonial, case study, customer name, metric, security certification, compliance claim, or integration before publishing.",
      expectedOutcome:
        "The page gains SaaS trust proof without adding unverified claims."
    };
  }

  if (
    page.intentMode === "saas" &&
    (cleanAction.includes("softwareapplication") ||
      cleanAction.includes("organization") ||
      cleanAction.includes("breadcrumblist") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("faqpage schema"))
  ) {
    return {
      whereToImplement:
        "SEO plugin custom schema field, page head, or page-level JSON-LD injection area.",
      whatToChange:
        "Add SoftwareApplication, Product, Organization, BreadcrumbList, or FAQPage schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      example:
        "Use SoftwareApplication schema for the SaaS product, Product schema where product fields are visible, Organization schema for the company, BreadcrumbList for navigation, and FAQPage only for visible FAQ questions and answers.",
      expectedOutcome:
        "Structured data supports SaaS product content without using LocalBusiness or location schema."
    };
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("comparison table") ||
      cleanAction.includes("pros and cons") ||
      cleanAction.includes("best for") ||
      cleanAction.includes("buyer guide"))
  ) {
    return {
      whereToImplement:
        "Inside the main buyer-intent content, near the product recommendations or comparison section.",
      whatToChange:
        "Add clear buyer sections that help readers compare products, understand trade-offs, and choose the right option.",
      example:
        "Example buyer section labels: Comparison table, Pros and cons, Best for budget buyers, Best for heavy users, How to choose.",
      expectedOutcome:
        "The page gives clearer buyer guidance without adding local service or location-page recommendations."
    };
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("affiliate disclosure") ||
      cleanAction.includes("author") ||
      cleanAction.includes("reviewer") ||
      cleanAction.includes("testing notes"))
  ) {
    return {
      whereToImplement:
        "Near the top of the article for disclosure, and near the byline or review sections for expertise/testing notes.",
      whatToChange:
        "Add only accurate affiliate trust wording. Do not invent testing, credentials, commissions, or review claims.",
      example:
        "Example disclosure: This page may contain affiliate links. If you buy through these links, we may earn a commission at no extra cost to you.",
      expectedOutcome:
        "Readers can understand how the page is monetised and why the recommendations are trustworthy."
    };
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("product, review") ||
      cleanAction.includes("itemlist") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("review schema"))
  ) {
    return {
      whereToImplement:
        "SEO plugin custom schema field, page head, or page-level JSON-LD injection area.",
      whatToChange:
        "Add Product, Review, or ItemList schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      example:
        "Use Product schema for a single reviewed product, Review schema for real review content, and ItemList schema for ranked roundups. Do not add FAQPage schema unless visible FAQ questions and answers exist on the page.",
      expectedOutcome:
        "Structured data supports affiliate buyer content without using LocalBusiness or location schema."
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

function getDeveloperQaChecklist(mode?: IntentMode): string[] {
  if (mode === "affiliate") {
    return [
      "- Run Google Rich Results Test",
      "- Validate JSON-LD",
      "- Check page still has one H1",
      "- Check affiliate disclosure is visible before affiliate links",
      "- Check product links work",
      "- Check comparison table works on mobile",
      "- Check Product, Review, or ItemList schema matches visible content",
      "- Check FAQPage schema is only added when visible FAQs exist"
    ];
  }

  if (mode === "saas") {
    return [
      "- Run Google Rich Results Test",
      "- Validate JSON-LD",
      "- Check page still has one H1",
      "- Check demo/free trial/signup CTA works",
      "- Check pricing links work",
      "- Check integration links work",
      "- Check screenshots/product visuals load on mobile",
      "- Validate SoftwareApplication/Product/FAQPage schema",
      "- Check FAQPage schema only matches visible FAQs",
      "- Check testimonials/case studies are real and approved",
      "- Check no duplicate/conflicting LocalBusiness schema remains unless the site genuinely needs it"
    ];
  }

  return [
    "- Run Google Rich Results Test",
    "- Validate JSON-LD",
    "- Check page still has one H1",
    "- Check phone links still work",
    "- Check page loads correctly on mobile",
    "- Check no duplicate/conflicting LocalBusiness schema remains"
  ];
}

export function generateDeveloperReport({
  page,
  result,
  benchmark,
  benchmarkInsights
}: GenerateReportInput): string {
  return [
    getReportTitle(page.intentMode),
    "",
    ...getAssistantInstructions(page.intentMode),
    "",
    "PAGE DETAILS",
    `- Intent mode: ${getIntentModeLabel(page.intentMode)}`,
    ...(getIntentModeNotice(page.intentMode)
      ? [`- Mode notice: ${getIntentModeNotice(page.intentMode)}`]
      : []),
    `- Target keyword: ${page.keyword ? cleanReportText(page.keyword) : "Not provided"}`,
    `- Location: ${page.location ? cleanReportText(page.location) : "Not provided"}`,
    `- URL: ${page.url || "Not provided"}`,
    `- Page title: ${page.title ? cleanReportText(page.title) : "Not provided"}`,
    `- Meta description: ${page.metaDescription ? cleanReportText(page.metaDescription) : "Not provided"}`,
    `- Score / grade: ${result.totalScore}/100 (${result.grade})`,
    "",
    "DO NOT CHANGE",
    listItems(getDoNotChangeItems(result, page.intentMode)),
    "",
    ...(formatExistingEditorialInternalLinks(page)
      ? [formatExistingEditorialInternalLinks(page), ""]
      : []),
    "COMPETITOR BENCHMARK",
    formatBenchmarkInsights(benchmarkInsights),
    "",
    formatBenchmark(benchmark, page.intentMode),
    "",
    "TASKS FOR DEVELOPER",
    formatTasks(result.prioritizedActions, "high", page),
    "",
    formatTasks(result.prioritizedActions, "medium", page),
    "",
    formatTasks(result.prioritizedActions, "low", page),
    "",
    "DEVELOPER QA CHECKLIST",
    ...getDeveloperQaChecklist(page.intentMode)
  ].join("\n");
}
