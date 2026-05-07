import type {
  BenchmarkCompetitor,
  BenchmarkInsights,
  ReportPageDetails
} from "./generate-report";
import type {
  IntentMode,
  PrioritizedAction,
  ScoreResult
} from "../scoring/types";

type GenerateAiTaskPackInput = {
  page: ReportPageDetails;
  result: ScoreResult;
  benchmark?: BenchmarkCompetitor[];
  benchmarkInsights?: BenchmarkInsights | null;
  executionMode?: ExecutionMode;
};

const priorityLabels: Record<PrioritizedAction["priority"], string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW"
};

const priorityRank: Record<PrioritizedAction["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2
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

function getTaskPackTitle(mode?: IntentMode): string {
  if (mode === "blog-media") {
    return "BLOG / MEDIA AI TASK PACK";
  }

  if (mode === "affiliate") {
    return "AFFILIATE CONTENT AI TASK PACK";
  }

  if (mode === "saas") {
    return "SAAS CONTENT AI TASK PACK";
  }

  return "LOCAL SEO AI TASK PACK";
}

function getIntentModeNotice(mode?: IntentMode): string {
  return mode && mode !== "local-seo"
    ? "This mode is in early support. Recommendations are adjusted lightly but full scoring is still being developed."
    : "";
}

export type ExecutionMode = "fast" | "balanced" | "thorough";

type ExecutionModeConfig = {
  label: string;
  summary: string;
  rules: string[];
  taskIntro: string;
  taskLimit?: number;
};

const executionModeConfig: Record<ExecutionMode, ExecutionModeConfig> = {
  fast: {
    label: "Fast",
    summary:
      "Use this mode for small WordPress edits only.",
    rules: [
      "Use this mode for small WordPress edits only.",
      "Do not scan the full page.",
      "Do not inspect unrelated pages.",
      "Do not run broad schema checks.",
      "Do not click every link unless specifically required.",
      "Validate only the changed item.",
      "Stop immediately after confirming the change.",
      "Aim to complete in fewer than 30 browser steps."
    ],
    taskIntro:
      "Fast mode includes the highest-impact tasks only. Complete them in order and stop when they are done.",
    taskLimit: 3
  },
  balanced: {
    label: "Balanced",
    summary:
      "Use the standard controlled implementation workflow. Balance impact, effort, and validation.",
    rules: [
      "Follow each task exactly as written.",
      "Make practical improvements without expanding scope.",
      "Validate each completed change before moving on.",
      "Ask for approval before any risky or uncertain change."
    ],
    taskIntro:
      "Balanced mode includes the standard prioritized task list. Complete one task at a time."
  },
  thorough: {
    label: "Thorough",
    summary:
      "Use a deeper implementation workflow. Add extra checks, evidence review, and validation before finalising changes.",
    rules: [
      "Review the relevant page content, metadata, schema, and competitor context before editing.",
      "Document assumptions and ask for confirmation where business facts are missing.",
      "Use the strongest validation path available for each task.",
      "After each task, record what changed, where it changed, and how it was checked."
    ],
    taskIntro:
      "Thorough mode includes the full prioritized task list with extra care on evidence, validation, and assumptions."
  }
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
      const displayTopic = destinationTopics[0] ?? anchorTopics[0] ?? cleanText(link.text);

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
    `- ${cleanText(link.text)} → ${link.url}\n  Reason: ${link.reason}`;

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
                `- Do not use ${cleanText(link.text)} → ${link.url}\n  Reason: ${link.rejectedReason}`
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
              `- Do not use ${cleanText(link.text)} → ${link.url}\n  Reason: ${link.rejectedReason}`
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
    `- ${cleanText(link.text)} → ${link.url}\n  Reason: ${link.reason}`;

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

function dedupeSimilarGaps(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  items.forEach((item) => {
    const key = item
      .toLowerCase()
      .replace(/\s+coverage\b/g, "")
      .replace(/\s+\(used by competitors\)/g, "")
      .trim();

    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  });

  return output;
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
    return page.intentMode === "blog-media"
      ? "Only edit the relevant article sections in the current page content."
      : page.intentMode === "affiliate"
        ? "Only edit the relevant buyer sections in the current page content."
        : page.intentMode === "saas"
          ? "Only edit the relevant product sections in the current page content."
      : "Only edit the relevant service sections in the current page content.";
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
  const targetKeyword = page.keyword ? cleanText(page.keyword) : "Cordless Vacuum Cleaners";

  if (
    page.intentMode === "affiliate" &&
    cleanAction.includes("page title")
  ) {
    return [
      "Use a buyer-intent title that includes the target keyword and the review/comparison promise.",
      "",
      `Example title: Best ${targetKeyword.replace(/^best\s+/i, "")} Tested & Reviewed`
    ].join("\n");
  }

  if (page.intentMode === "saas" && cleanAction.includes("page title")) {
    const isComparisonTask = /\b(?:comparison|compare|review|alternative|alternatives)\b/i.test(
      `${cleanAction} ${page.keyword} ${page.title}`
    );

    return [
      isComparisonTask
        ? "Use a comparison-led title that includes the target keyword and the SaaS comparison promise."
        : "Use a product-led title that includes the target keyword and the SaaS product/use-case promise.",
      "",
      isComparisonTask
        ? `Example title: Best ${targetKeyword.replace(/^best\s+/i, "")} Compared for Growing Teams`
        : `Example title: ${targetKeyword} Software for Growing Teams`
    ].join("\n");
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("product, review") ||
      cleanAction.includes("itemlist") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("review schema"))
  ) {
    return [
      "Add Product, Review, or ItemList schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      "- Product: for a single reviewed product.",
      "- Review: for real review content.",
      "- ItemList: for ranked roundups.",
      "- FAQPage: only when visible FAQ questions and answers exist on the page."
    ].join("\n");
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
    const isComparisonSchema =
      cleanAction.includes("article") || cleanAction.includes("itemlist");

    return [
      isComparisonSchema
        ? "Add Article, ItemList, Product, or FAQPage schema where appropriate. Only add FAQPage schema if visible FAQs are added first."
        : "Add SoftwareApplication, Product, Organization, BreadcrumbList, or FAQPage schema where appropriate. Only add FAQPage schema if visible FAQs are added first.",
      ...(isComparisonSchema
        ? [
            "- Article: for the comparison/review article.",
            "- ItemList: for ranked or listed tools.",
            "- Product: where product fields are visible."
          ]
        : [
            "- SoftwareApplication: for the SaaS product.",
            "- Product: where product fields are visible.",
            "- Organization: for company-level details.",
            "- BreadcrumbList: for navigation."
          ]),
      "- FAQPage: only when visible FAQ questions and answers exist on the page."
    ].join("\n");
  }

  if (cleanAction.includes("faqpage schema")) {
    return getFaqJsonLd(page);
  }

  if (cleanAction.includes("internal links")) {
    return formatInternalLinkRecommendations(page);
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

    return [
      isComparisonTask
        ? "Add SaaS comparison structure only where it matches visible product facts."
        : "Add SaaS product structure only where it matches visible product facts.",
      "",
      isComparisonTask
        ? [
            "Suggested comparison section labels:",
            "- Comparison table",
            "- Best for",
            "- Key features compared",
            "- Pricing/free trial comparison",
            "- Integrations compared",
            "- Setup/onboarding notes",
            "- Pros and cons",
            "- FAQs"
          ].join("\n")
        : [
            "Suggested section labels:",
            "- Key features",
            "- Use cases",
            "- Integrations",
            "- Pricing and trial",
            "- Product screenshots",
            "- Compare alternatives"
          ].join("\n")
    ].join("\n");
  }

  if (
    page.intentMode === "saas" &&
    (cleanAction.includes("testimonials") ||
      cleanAction.includes("case studies") ||
      cleanAction.includes("security") ||
      cleanAction.includes("compliance"))
  ) {
    return [
      "Use only accurate SaaS trust wording.",
      "",
      "CASE STUDY / TESTIMONIAL RULE",
      "- Only include testimonials, case studies, customer names, metrics, or outcomes if the business owner confirms they are real.",
      "- Do not invent customers, results, screenshots, integrations, compliance claims, or security certifications."
    ].join("\n");
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("comparison table") ||
      cleanAction.includes("pros and cons") ||
      cleanAction.includes("best for") ||
      cleanAction.includes("buyer guide"))
  ) {
    return [
      "Add buyer-intent structure only where it matches visible content.",
      "",
      "Suggested section labels:",
      "- Comparison table",
      "- Pros and cons",
      "- Best for [buyer type]",
      "- How to choose"
    ].join("\n");
  }

  if (
    page.intentMode === "affiliate" &&
    (cleanAction.includes("affiliate disclosure") ||
      cleanAction.includes("author") ||
      cleanAction.includes("reviewer") ||
      cleanAction.includes("testing notes"))
  ) {
    return [
      "Use only accurate disclosure and trust wording.",
      "",
      "Disclosure example:",
      "This page may contain affiliate links. If you buy through these links, we may earn a commission at no extra cost to you.",
      "",
      "Business owner must confirm any testing, reviewer, commission, or credentials claim before publishing."
    ].join("\n");
  }

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return [
      "No code yet.",
      page.intentMode === "affiliate"
        ? "First list each detected Product, Review, ItemList, or FAQPage schema source and any conflicting product, review, item, or FAQ values."
        : page.intentMode === "saas"
          ? "First list each detected SoftwareApplication, Product, Organization, BreadcrumbList, or FAQPage schema source and any conflicting product, organization, breadcrumb, or FAQ values."
        : "First list each detected LocalBusiness schema source and any conflicting name, URL, phone, address, openingHours, geo, or areaServed values.",
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
    const location = page.location ? cleanText(page.location) : "[target location]";

    return `Need computer repair in ${location}? Get fast, reliable laptop, PC and Mac repairs from Dave at CWC Computers. Call today for friendly local advice.`;
  }

  return "No copy-paste content available. Create the smallest practical WordPress change needed for this task.";
}

function getDoNotTouchList(
  action: PrioritizedAction,
  executionMode: ExecutionMode
): string[] {
  const cleanAction = action.action.toLowerCase();
  const items = [
    "Do not work on any other task from this pack.",
    "Do not rewrite the full page.",
    "Do not change unrelated WordPress settings or site behaviour.",
    "Do not invent facts, reviews, case studies, services, locations, or claims."
  ];

  if (cleanAction.includes("internal links")) {
    items.push("Do not create links to pages that do not exist.");
    items.push("Do not edit unrelated page sections.");

    if (executionMode === "fast") {
      items.push(
        "Do not create new snippets unless the page already uses a snippet for this exact task."
      );
      items.push(
        "Prefer editing the existing relevant page content or existing relevant snippet only."
      );
      items.push("Do not inspect unrelated pages.");
    }
  }

  if (cleanAction.includes("schema")) {
    items.push("Do not remove existing schema until the replacement is confirmed.");
  }

  if (cleanAction.includes("case study") || cleanAction.includes("example job")) {
    items.push("Do not write a case study without business owner confirmation.");
  }

  return items;
}

function getValidationSteps(
  action: PrioritizedAction,
  executionMode: ExecutionMode,
  intentMode?: IntentMode
): string[] {
  const cleanAction = action.action.toLowerCase();

  if (
    intentMode === "saas" &&
    (cleanAction.includes("softwareapplication") ||
      cleanAction.includes("product schema") ||
      cleanAction.includes("organization") ||
      cleanAction.includes("breadcrumblist") ||
      cleanAction.includes("faqpage schema"))
  ) {
    return [
      "Run Google Rich Results Test.",
      "Run Schema.org validator.",
      "Validate SoftwareApplication/Product/FAQPage schema where used.",
      "Confirm FAQPage schema only matches visible FAQs."
    ];
  }

  if (cleanAction.includes("faqpage schema")) {
    return [
      "Run Google Rich Results Test.",
      "Run Schema.org validator.",
      "Confirm each FAQ schema question and answer matches visible page content."
    ];
  }

  if (cleanAction.includes("internal links")) {
    if (executionMode === "fast") {
      return [
        "Confirm the approved links are present.",
        "Confirm rejected/risky links were not added.",
        "Stop after a short summary."
      ];
    }

    return [
      "Click each new link and confirm it opens an existing page.",
      "Confirm only relevant article or page sections were edited.",
      "Check the page still reads naturally."
    ];
  }

  if (cleanAction.includes("schema blocks") || cleanAction.includes("consolidate")) {
    return [
      intentMode === "affiliate"
        ? "List all detected Product, Review, ItemList, and FAQPage schema blocks and their source if known."
        : intentMode === "saas"
          ? "List all detected SoftwareApplication, Product, Organization, BreadcrumbList, and FAQPage schema blocks and their source if known."
        : "List all detected schema blocks and their source if known.",
      intentMode === "affiliate"
        ? "Identify duplicate or conflicting product, review, list, or FAQ fields."
        : intentMode === "saas"
          ? "Identify duplicate or conflicting product, organization, breadcrumb, or FAQ fields."
        : "Identify duplicate or conflicting LocalBusiness fields.",
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
  page: ReportPageDetails,
  executionMode: ExecutionMode
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
    ...getDoNotTouchList(action, executionMode).map((item) => `- ${item}`),
    "",
    "Validation steps:",
    ...getValidationSteps(action, executionMode, page.intentMode).map((step) => `- ${step}`),
    "",
    "Stop condition:",
    getStopCondition(action)
  ].join("\n");
}

function formatBenchmarkContext(
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
            `- Title: ${competitor.title ? cleanText(competitor.title) : "Not found"}`,
            `- Status: ${
              competitor.fetchStatus === "limited"
                ? "Limited fetch"
                : "Inaccessible"
            }`,
            `- Reason: ${
              competitor.fetchReason
                ? cleanText(competitor.fetchReason)
                : "Competitor page could not be fully analysed due to fetch restrictions."
            }`,
            competitor.insightSource === "snippet-only"
              ? `- Snippet-only insight: ${
                  competitor.topicsServices.length
                    ? competitor.topicsServices.map(cleanText).join(", ")
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
        `- Title: ${competitor.title ? cleanText(competitor.title) : "Not found"}`,
        competitor.fetchStatus === "limited" ? "- Status: Limited fetch" : "",
        competitor.fetchReason
          ? `- Reason: ${cleanText(competitor.fetchReason)}`
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
            ? competitor.trustSignals.map(cleanText).join(", ")
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
            ? competitor.topicsServices.map(cleanText).join(", ")
            : "None detected"
        }`,
        "Target page gaps found:",
        competitor.gapsFound.length
          ? dedupeSimilarGaps(
              competitor.gapsFound.map((gap) => simplifyBenchmarkGap(gap, mode))
            )
              .map((gap) => `- ${cleanText(gap)}`)
              .join("\n")
          : "- No consistent patterns detected across competitors yet"
      ]
        .filter(Boolean)
        .join("\n");
      })
      .join("\n\n")
  ].join("\n");
}

function formatBenchmarkInsightsContext(
  insights?: BenchmarkInsights | null
): string {
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
    "Combined competitor insights:",
    ...insights.commonPatterns.map((pattern) => `- ${cleanText(pattern)}`),
    "",
    "Majority signals:",
    ...(insights.majoritySignals.length
      ? insights.majoritySignals.map((signal) => `- ${cleanText(signal)}`)
      : ["- Not enough competitor overlap to identify strong patterns yet"]),
    "",
    "Overall competitive position:",
    `- Content depth: ${cleanText(insights.overallPositionSections.contentDepth)}`,
    `- Trust signals: ${cleanText(insights.overallPositionSections.trustSignals)}`,
    `- ${coverageLabel}: ${cleanText(insights.overallPositionSections.serviceCoverage)}`,
    `- Summary: ${cleanText(insights.overallPositionSections.summary)}`,
    "",
    "Content depth comparison:",
    `- ${cleanText(insights.contentDepthComparison)}`,
    "",
    overlapLabel,
    ...(insights.topicServiceOverlap.length
      ? insights.topicServiceOverlap.map((item) => `- ${cleanText(item)}`)
      : ["- Not enough competitor overlap to identify strong patterns yet"]),
    "",
    "Key gaps on target page:",
    ...(insights.keyGaps.length
      ? dedupeSimilarGaps(insights.keyGaps).map((gap) => `- ${cleanText(gap)}`)
      : ["- No consistent patterns detected across competitors yet"]),
    "",
    "Top recommended next step:",
    `- ${cleanText(insights.topRecommendedNextStep)}`,
    "",
    "Priority actions based on competitors:",
    "Recommended improvements are based on competitor comparison. Focus on the top action first for the fastest impact.",
    "",
    ...formatBenchmarkActionGroups(insights)
  ].join("\n");
}

function formatBenchmarkActionGroups(insights: BenchmarkInsights): string[] {
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

  return groups.flatMap((group, index) => [
    `${index + 1}. ${group.title}`,
    ...group.items.map((item) => `- ${item}`),
    ""
  ]);
}

function getHighestPriorityAction(
  actions: PrioritizedAction[]
): PrioritizedAction | null {
  return (
    actions
      .map((action, index) => ({ action, index }))
      .sort(
        (first, second) =>
          priorityRank[first.action.priority] -
            priorityRank[second.action.priority] || first.index - second.index
      )[0]?.action ?? null
  );
}

function formatOptionalLine(label: string, value: string): string[] {
  const cleanValue = cleanText(value);

  return cleanValue ? [`${label}: ${cleanValue}`] : [];
}

function formatFastAction(
  action: PrioritizedAction | null,
  page: ReportPageDetails
): string {
  if (!action) {
    return "No prioritized action was generated for this page.";
  }

  const actionText = cleanText(action.action);

  if (/add areaserved to localbusiness schema/i.test(actionText)) {
    const location = cleanText(page.location) || "the target location";

    return `Find the existing LocalBusiness JSON-LD schema block and add exactly this field: \`"areaServed": "${location}"\`.`;
  }

  return actionText;
}

function isInternalLinkAction(action: PrioritizedAction | null): boolean {
  return action
    ? cleanText(action.action).toLowerCase().includes("internal links")
    : false;
}

function generateFastInternalLinkTaskPack({
  page
}: {
  page: ReportPageDetails;
}): string {
  const link = getInternalLinkRecommendations(page).highConfidence[0];
  const anchorText = link ? cleanText(link.text) : "No high-confidence link found.";
  const destinationUrl = link ? link.url : "Do not add a link.";

  return [
    "You are editing the live WordPress site only.",
    "",
    "Task: Add ONE internal link to the target page.",
    "",
    `Intent mode: ${getIntentModeLabel(page.intentMode)}`,
    ...formatOptionalLine("Mode notice", getIntentModeNotice(page.intentMode)),
    `Target page: ${page.url || "Not provided"}`,
    "",
    "Add this one internal link once.",
    anchorText,
    destinationUrl,
    "",
    "Where:",
    page.intentMode === "blog-media"
      ? "Add it in the most relevant existing article section only."
      : page.intentMode === "affiliate"
        ? "Add it in the most relevant existing buyer section only."
      : "Add it in the most relevant existing section only.",
    "",
    "Rules:",
    "",
    "* Do not add any other links.",
    "* Do not edit unrelated sections.",
    "* Do not scan the full site.",
    "* Do not check rejected links.",
    "* Stop if this cannot be done in 30 browser steps.",
    "",
    "Output:",
    "",
    "* Confirm where the link was added.",
    "* Do not continue."
  ].join("\n");
}

function generateFastAiTaskPack({
  page,
  result
}: {
  page: ReportPageDetails;
  result: ScoreResult;
}): string {
  const action = getHighestPriorityAction(result.prioritizedActions);

  if (isInternalLinkAction(action)) {
    return generateFastInternalLinkTaskPack({ page });
  }

  return [
    getTaskPackTitle(page.intentMode),
    "",
    "You are editing the live WordPress site only.",
    "",
    "Mode: FAST",
    `Intent mode: ${getIntentModeLabel(page.intentMode)}`,
    ...formatOptionalLine("Mode notice", getIntentModeNotice(page.intentMode)),
    `Target page: ${page.url || "Not provided"}`,
    ...formatOptionalLine("Keyword", page.keyword),
    ...formatOptionalLine("Location", page.location),
    "",
    "Execution limit:",
    "",
    "* Complete in 30 browser steps or fewer.",
    "* Do not explain a plan first.",
    "* Do not inspect unrelated settings, plugins, pages, menus, links, or schema sources.",
    "* If the exact edit location is found, make the change immediately and stop.",
    "* If the edit location is not found within 30 steps, stop and report what was checked.",
    "",
    "Complete this one task only:",
    "",
    formatFastAction(action, page),
    "",
    "Rules:",
    "",
    "* Edit only what is required for this task.",
    "* Do not change anything unrelated.",
    "* Do not create duplicate schema or duplicate content.",
    "* Do not inspect unrelated pages or settings.",
    "",
    "Output:",
    "",
    "* Confirm exactly what changed.",
    "* Show the edited snippet or changed section only."
  ].join("\n");
}

export function generateAiTaskPack({
  page,
  result,
  benchmark,
  benchmarkInsights,
  executionMode = "balanced"
}: GenerateAiTaskPackInput): string {
  if (executionMode === "fast") {
    return generateFastAiTaskPack({ page, result });
  }

  const mode = executionModeConfig[executionMode];
  const prioritizedActions = mode.taskLimit
    ? result.prioritizedActions.slice(0, mode.taskLimit)
    : result.prioritizedActions;

  return [
    getTaskPackTitle(page.intentMode),
    "",
    "EXECUTION MODE",
    `- Mode: ${mode.label.toUpperCase()}`,
    `- Approach: ${mode.summary}`,
    "",
    "MODE RULES",
    ...mode.rules.map((rule) => `- ${rule}`),
    "",
    "STRICT RULES",
    "- Work on ONE task only.",
    "- Do not explore unrelated WordPress settings.",
    "- Do not make extra changes beyond the task.",
    "- Do not create extra snippets unless required.",
    "- Before making changes, explain the plan.",
    "- After making changes, stop and summarise.",
    "- Do not continue to the next task until approved.",
    ...(page.intentMode === "saas"
      ? [
          "- CASE STUDY / TESTIMONIAL RULE: Only include testimonials, case studies, customer names, metrics, or outcomes if the business owner confirms they are real.",
          "- Do not invent customers, results, screenshots, integrations, compliance claims, or security certifications."
        ]
      : []),
    "",
    "WORKING CONTEXT",
    "- You are editing the live WordPress site only.",
    "- Do not edit the local app project.",
    "- Do not mention Git, ZIP files, npm, Codex, Vercel, or project files.",
    "- Do not attempt to access localhost or file:// URLs.",
    "- Work only inside WordPress/admin/browser tools.",
    "",
    "PAGE CONTEXT",
    `- Intent mode: ${getIntentModeLabel(page.intentMode)}`,
    ...(getIntentModeNotice(page.intentMode)
      ? [`- Mode notice: ${getIntentModeNotice(page.intentMode)}`]
      : []),
    `- Target keyword: ${page.keyword ? cleanText(page.keyword) : "Not provided"}`,
    `- Location: ${page.location ? cleanText(page.location) : "Not provided"}`,
    `- URL: ${page.url || "Not provided"}`,
    `- Page title: ${page.title ? cleanText(page.title) : "Not provided"}`,
    `- Meta description: ${page.metaDescription ? cleanText(page.metaDescription) : "Not provided"}`,
    `- Score / grade: ${result.totalScore}/100 (${result.grade})`,
    "",
    ...(formatExistingEditorialInternalLinks(page)
      ? [formatExistingEditorialInternalLinks(page), ""]
      : []),
    "COMPETITOR BENCHMARK CONTEXT",
    formatBenchmarkInsightsContext(benchmarkInsights),
    "",
    formatBenchmarkContext(benchmark, page.intentMode),
    "",
    "TASKS",
    mode.taskIntro,
    "",
    prioritizedActions.length
      ? prioritizedActions
          .map((action, index) =>
            formatTask(action, index, page, executionMode)
          )
          .join("\n\n---\n\n")
      : "No prioritized actions were generated."
  ].join("\n");
}
