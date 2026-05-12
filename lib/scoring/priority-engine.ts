import type {
  ExtractedSignals,
  IntentMode,
  PrioritizedAction,
  PriorityAction,
  ScoringInput
} from "./types";

export function createPriorityActions(
  input: ScoringInput,
  signals: ExtractedSignals
): PriorityAction[] {
  const intentMode = getIntentMode(input);
  const actions: PriorityAction[] = [];

  if (intentMode === "blog-media") {
    if (!signals.titleKeywordMatch) {
      actions.push({
        id: "add-topic-to-title",
        title: "Make the target topic clear in the page title",
        priority: "high"
      });
    }

    if (!signals.metaDescriptionKeywordMatch) {
      actions.push({
        id: "add-topic-to-meta-description",
        title: "Make the target topic clear in the meta description",
        priority: "medium"
      });
    }

    if (!signals.topicSignals.includes("PAA-style question coverage")) {
      actions.push({
        id: "add-paa-style-questions",
        title: "Add PAA-style questions or FAQs",
        priority: "medium"
      });
    }

    if (!signals.topicSignals.includes("Semantic breadth")) {
      actions.push({
        id: "improve-semantic-depth",
        title: "Improve semantic depth around the main topic",
        priority: "high"
      });
    }

    if (!signals.topicSignals.includes("Troubleshooting coverage")) {
      actions.push({
        id: "expand-troubleshooting",
        title: "Expand troubleshooting coverage",
        priority: "medium"
      });
    }

    return actions;
  }

  if (intentMode === "affiliate") {
    if (!signals.titleKeywordMatch) {
      actions.push({
        id: "add-buyer-topic-to-title",
        title: "Make the buyer-intent topic clear in the page title",
        priority: "high"
      });
    }

    if (!signals.metaDescriptionKeywordMatch) {
      actions.push({
        id: "add-buyer-topic-to-meta-description",
        title: "Make the buyer-intent topic clear in the meta description",
        priority: "medium"
      });
    }

    if (!signals.topicSignals.includes("Comparison tables/criteria")) {
      actions.push({
        id: "add-comparison-table",
        title: "Add a comparison table or clear comparison criteria",
        priority: "high"
      });
    }

    if (!signals.topicSignals.includes("Pros and cons")) {
      actions.push({
        id: "add-pros-and-cons",
        title: "Add pros and cons for the products or options covered",
        priority: "medium"
      });
    }

    if (
      !signals.affiliateChecks?.visibleAffiliateDisclosurePresent &&
      !signals.trustSignals.includes("Affiliate disclosure")
    ) {
      actions.push({
        id: "add-affiliate-disclosure",
        title: "Add a clear affiliate disclosure",
        priority: "high"
      });
    }

    return actions;
  }

  if (intentMode === "saas") {
    const isComparisonPage = isSaasComparisonPage(input);

    if (!signals.titleKeywordMatch) {
      actions.push({
        id: "add-product-topic-to-title",
        title: isComparisonPage
          ? "Clarify the SaaS comparison angle in the page title"
          : "Make the SaaS product topic clear in the page title",
        priority: "high"
      });
    }

    if (!signals.metaDescriptionKeywordMatch) {
      actions.push({
        id: "add-product-topic-to-meta-description",
        title: isComparisonPage
          ? "Clarify the SaaS comparison angle in the meta description"
          : "Make the SaaS product topic clear in the meta description",
        priority: "medium"
      });
    }

    if (!signals.topicSignals.includes("Features")) {
      actions.push({
        id: "add-feature-sections",
        title: "Add clear product feature sections",
        priority: "high"
      });
    }

    if (!signals.topicSignals.includes("Use cases/personas")) {
      actions.push({
        id: "add-use-case-sections",
        title: "Add use-case or persona sections",
        priority: "medium"
      });
    }

    if (!signals.topicSignals.includes("Pricing/free trial/demo language")) {
      actions.push({
        id: "add-demo-trial-pricing-cta",
        title: "Add pricing, free trial, demo, or signup CTA wording",
        priority: "high"
      });
    }

    return actions;
  }

  if (!signals.titleKeywordMatch) {
    actions.push({
      id: "add-keyword-to-title",
      title: "Add the target keyword to the page title",
      priority: "high"
    });
  }

  if (!signals.metaDescriptionKeywordMatch) {
    actions.push({
      id: "add-keyword-to-meta-description",
      title: "Add the target keyword to the meta description",
      priority: "medium"
    });
  }

  if (!signals.metaDescriptionLocationMatch) {
    actions.push({
      id: "add-location-to-meta-description",
      title: "Add the location to the meta description",
      priority: "medium"
    });
  }

  if (signals.locationMentionCount === 0) {
    actions.push({
      id: "add-location-mentions",
      title: "Mention the target location on the page",
      priority: "high"
    });
  }

  if (!signals.hasPhoneNumber) {
    actions.push({
      id: "add-phone-number",
      title: "Add a phone number",
      priority: "high"
    });
  }

  if (signals.ctaWords.length === 0) {
    actions.push({
      id: "add-call-to-action",
      title: "Add a clear call to action",
      priority: "medium"
    });
  }

  if (
    !signals.schemaTypes.some((type) =>
      ["LocalBusiness", "Service", "FAQPage"].includes(type)
    )
  ) {
    actions.push({
      id: "add-local-schema",
      title: "Add LocalBusiness, Service, or FAQPage schema",
      priority: "medium"
    });
  }

  return actions;
}

type ActionInput = {
  action: string;
  whyItMatters: string;
  impact: number;
  ease: number;
};

function mapPriority(priorityScore: number): PrioritizedAction["priority"] {
  if (priorityScore >= 8) {
    return "high";
  }

  if (priorityScore >= 5) {
    return "medium";
  }

  return "low";
}

function createAction(input: ActionInput): PrioritizedAction {
  const priorityScore = input.impact * 0.7 + input.ease * 0.3;

  return {
    priority: mapPriority(priorityScore),
    action: input.action,
    whyItMatters: input.whyItMatters,
    estimatedScoreGain: input.impact
  };
}

function getIntentMode(input: ScoringInput): IntentMode {
  return input.intentMode ?? "local-seo";
}

function adjustActionForIntentMode(
  action: PrioritizedAction,
  mode: IntentMode
): PrioritizedAction {
  if (mode === "local-seo") {
    return action;
  }

  const cleanAction = action.action.toLowerCase();

  if (mode === "affiliate") {
    if (cleanAction.includes("localbusiness schema")) {
      return {
        ...action,
        action: "Review structured data for affiliate content, such as Article, Product, Review, or FAQPage schema where relevant.",
        whyItMatters:
          "Affiliate pages need clear content and product context; full affiliate scoring is still being developed."
      };
    }

    if (cleanAction.includes("target location")) {
      return {
        ...action,
        action: "Make the target topic clear in the page content.",
        whyItMatters:
          "Affiliate recommendations should clearly connect the page content to the reader's buying or comparison intent."
      };
    }
  }

  if (mode === "saas") {
    if (cleanAction.includes("phone number")) {
      return {
        ...action,
        action: "Add a clear conversion route, such as demo, signup, trial, or contact sales.",
        whyItMatters:
          "SaaS pages need an obvious next step for visitors evaluating the product."
      };
    }

    if (cleanAction.includes("localbusiness schema")) {
      return {
        ...action,
        action: "Review structured data for SaaS content, such as SoftwareApplication, Product, Organization, or FAQPage schema where relevant.",
        whyItMatters:
          "Structured data can clarify the product, organization, and support content; full SaaS scoring is still being developed."
      };
    }
  }

  if (mode === "blog-media") {
    if (cleanAction.includes("phone number")) {
      return {
        ...action,
        action: "Add a clear reader next step, such as newsletter signup, related articles, or a useful resource link.",
        whyItMatters:
          "Blog and media pages should guide readers toward deeper engagement after they finish the article."
      };
    }

    if (cleanAction.includes("localbusiness schema")) {
      return {
        ...action,
        action: "Review structured data for editorial content, such as Article, BlogPosting, BreadcrumbList, or FAQPage schema where relevant.",
        whyItMatters:
          "Editorial schema helps clarify article structure and context; full blog/media scoring is still being developed."
      };
    }
  }

  if (
    cleanAction.includes("target location") ||
    cleanAction.includes("local mentions") ||
    cleanAction.includes("location-specific")
  ) {
    return {
      ...action,
      action: action.action
        .replace(/target location/gi, "target topic")
        .replace(/local mentions/gi, "topical mentions")
        .replace(/location-specific/gi, "topic-specific"),
      whyItMatters:
        "This mode is in early support, so recommendations are adjusted lightly while full scoring is still being developed."
    };
  }

  return action;
}

function includesAny(text: string, words: string[]): boolean {
  const cleanText = text.toLowerCase();
  return words.some((word) => cleanText.includes(word));
}

function countSchemaTypes(schemaSource: string): number {
  return schemaSource.match(/"@type"\s*:/gi)?.length ?? 0;
}

const blogMediaInternalLinkTopics = [
  "fix",
  "slow",
  "computer",
  "pc",
  "ssd",
  "ssd upgrade",
  "malware",
  "malware removal",
  "safe",
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
  "windows update",
  "ram",
  "ram usage",
  "hard drive",
  "hard drive failure",
  "antivirus"
];

const affiliateInternalLinkTopics = [
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
  "how-to buyer",
  "product",
  "products",
  "alternatives",
  "pricing",
  "price",
  "deal",
  "discount",
  "value"
];

const saasInternalLinkTopics = [
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
  "help",
  "help center",
  "help centre",
  "support",
  "comparison",
  "compare",
  "alternatives",
  "alternative",
  "customers",
  "case study",
  "security",
  "api"
];

function classifyBlogMediaInternalLink(url: string): "editorial" | "weak" {
  try {
    const path = new URL(url).pathname.toLowerCase();

    if (
      /(location|areas-we-cover|near-me|chard|ilminster|somerset|yeovil|taunton)/.test(
        path
      )
    ) {
      return "weak";
    }

    if (/(blog|news|article|articles|post|posts|guide|guides|help|faq|support|resource|resources)/.test(path)) {
      return "editorial";
    }
  } catch {
    // Fall through to topic matching.
  }

  return "weak";
}

function isWeakBlogMediaInternalUrl(url: string): boolean {
  try {
    return /(location|areas-we-cover|near-me|chard|ilminster|somerset|yeovil|taunton)/.test(
      new URL(url).pathname.toLowerCase()
    );
  } catch {
    return false;
  }
}

function extractInternalLinksFromHtml(
  websiteUrl?: string,
  html?: string
): Array<{ text: string; url: string }> {
  if (!websiteUrl || !html) {
    return [];
  }

  try {
    const baseUrl = new URL(websiteUrl);
    const links: Array<{ text: string; url: string }> = [];
    const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match = linkPattern.exec(html);

    while (match) {
      const resolvedUrl = new URL(match[1], baseUrl);

      if (resolvedUrl.hostname === baseUrl.hostname) {
        links.push({
          text: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          url: resolvedUrl.toString()
        });
      }

      match = linkPattern.exec(html);
    }

    return links;
  } catch {
    return [];
  }
}

function hasRelevantBlogMediaInternalLinks(
  links?: ScoringInput["relatedInternalLinks"]
): boolean {
  if (!links || links.length === 0) {
    return false;
  }

  const relevantLinks = links.filter((link) => {
    const comparable = `${link.text} ${link.url}`.toLowerCase();
    const hasTopicMatch = blogMediaInternalLinkTopics.some((topic) =>
      comparable.includes(topic)
    );

    return (
      hasTopicMatch &&
      (classifyBlogMediaInternalLink(link.url) === "editorial" ||
        !isWeakBlogMediaInternalUrl(link.url))
    );
  });

  return relevantLinks.length >= 2;
}

function isWeakAffiliateInternalUrl(url: string): boolean {
  try {
    return /(location|areas-we-cover|near-me|service-area|chard|ilminster|somerset|yeovil|taunton)/.test(
      new URL(url).pathname.toLowerCase()
    );
  } catch {
    return false;
  }
}

function hasRelevantAffiliateInternalLinks(
  links?: ScoringInput["relatedInternalLinks"]
): boolean {
  if (!links || links.length === 0) {
    return false;
  }

  const relevantLinks = links.filter((link) => {
    const comparable = `${link.text} ${link.url}`.toLowerCase();
    const hasTopicMatch = affiliateInternalLinkTopics.some((topic) =>
      comparable.includes(topic)
    );

    return hasTopicMatch && !isWeakAffiliateInternalUrl(link.url);
  });

  return relevantLinks.length >= 1;
}

function isWeakSaasInternalUrl(url: string): boolean {
  try {
    return /(location|areas-we-cover|near-me|service-area|chard|ilminster|somerset|yeovil|taunton)/.test(
      new URL(url).pathname.toLowerCase()
    );
  } catch {
    return false;
  }
}

function hasRelevantSaasInternalLinks(
  links?: ScoringInput["relatedInternalLinks"]
): boolean {
  if (!links || links.length === 0) {
    return false;
  }

  const relevantLinks = links.filter((link) => {
    const comparable = `${link.text} ${link.url}`.toLowerCase();
    const hasTopicMatch = saasInternalLinkTopics.some((topic) =>
      comparable.includes(topic)
    );

    return hasTopicMatch && !isWeakSaasInternalUrl(link.url);
  });

  return relevantLinks.length >= 1;
}

function isSaasComparisonPage(input: ScoringInput): boolean {
  const urlPath = getUrlPath(input.websiteUrl);
  const titleAndMeta = `${input.title ?? ""}\n${input.metaDescription ?? ""}`;
  const headings = [
    ...(input.headings?.h1 ?? []),
    ...(input.headings?.h2 ?? []),
    ...(input.headings?.h3 ?? [])
  ].join("\n");
  const targetContent = `${input.text ?? ""}\n${headings}\n${input.html ?? ""}`;

  const hasComparisonUrl =
    /(?:^|\/)(?:best|compare|comparison|alternatives?|reviews?|top-tools?)(?:\/|-|$)/i.test(
      urlPath
    ) || /(?:^|\/|-)vs(?:-|\/|$)/i.test(urlPath);

  const hasComparisonTitleOrMeta =
    /\b(?:best|top tools?|alternatives?|vs\.?|versus|compare|comparison|reviews?)\b/i.test(
      titleAndMeta
    );

  const hasComparisonHeading =
    /\b(?:best .* tools?|top .* tools?|alternatives? to|comparison table|versus|vs\.?|compare .* software|reviews?)\b/i.test(
      headings
    );

  const comparisonSignals = [
    /\bcomparison table\b/i,
    /\bkey features compared\b/i,
    /\bpricing(?:\/|\s+and\s+)?free trial comparison\b/i,
    /\bintegrations compared\b/i,
    /\bbest for\b/i,
    /\bpros and cons\b/i,
    /\balternatives to\b/i,
    /\btop tools?\b/i,
    /\bvs\.?\b|\bversus\b/i
  ];
  const signalCount = comparisonSignals.filter((pattern) =>
    pattern.test(targetContent)
  ).length;

  return (
    hasComparisonUrl ||
    hasComparisonTitleOrMeta ||
    hasComparisonHeading ||
    signalCount >= 2
  );
}

function getUrlPath(url?: string): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function createBlogMediaPrioritizedActions(
  input: ScoringInput,
  signals: ExtractedSignals
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];
  const pageText = `${input.text ?? ""}\n${input.html ?? ""}`;
  const detectedInternalLinks = [
    ...(input.relatedInternalLinks ?? []),
    ...extractInternalLinksFromHtml(input.websiteUrl, input.html)
  ];
  const hasInternalLinks =
    hasRelevantBlogMediaInternalLinks(detectedInternalLinks) ||
    /\brelated (?:articles|content|guides|resources)\b/i.test(pageText);
  const hasFaqCoverage = signals.trustSignals.includes("FAQ coverage");
  const hasAuthorExpertise = signals.trustSignals.includes("Author expertise");
  const hasExamples = signals.trustSignals.includes(
    "Examples/tutorial style content"
  );
  const hasCitations = signals.trustSignals.includes("Citations/resources");
  const hasTableOfContents = /\b(?:table of contents|contents|in this guide|on this page)\b/i.test(
    pageText
  );
  const hasMedia = /<img\b|<picture\b|<video\b|\b(?:diagram|screenshot|screenshots|image|images|chart|table)\b/i.test(
    pageText
  );
  const hasPrimaryArticleSchema = signals.schemaTypes.some((type) =>
    ["Article", "BlogPosting", "HowTo"].includes(type)
  );

  if (!signals.titleKeywordMatch) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: "Make the target topic clear in the page title.",
        whyItMatters:
          "Blog and media pages need a clear topic promise so readers and search engines understand the article quickly."
      })
    );
  }

  if (!hasFaqCoverage) {
    actions.push(
      createAction({
        impact: 7,
        ease: 7,
        action: "Add FAQs or PAA-style questions that match reader search intent.",
        whyItMatters:
          "Question-led sections improve informational intent coverage and help the article answer follow-up searches."
      })
    );
  }

  if (!signals.topicSignals.includes("Semantic breadth")) {
    actions.push(
      createAction({
        impact: 7,
        ease: 6,
        action: "Improve semantic depth with related subtopics, comparisons, causes, options, and definitions.",
        whyItMatters:
          "Semantic breadth helps informational content cover the topic more completely without relying on repetition."
      })
    );
  }

  if (!signals.topicSignals.includes("Troubleshooting coverage")) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: "Expand troubleshooting sections with clear problems, causes, fixes, and next steps.",
        whyItMatters:
          "Troubleshooting coverage helps the page satisfy practical informational searches."
      })
    );
  }

  if (!hasInternalLinks) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: "Add supporting internal links to related articles, guides, or resources.",
        whyItMatters:
          "Related internal links help readers continue learning and help search engines understand editorial topic clusters."
      })
    );
  }

  if (!hasAuthorExpertise) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: "Add a short author bio or expertise note.",
        whyItMatters:
          "Author expertise helps readers understand why the article can be trusted."
      })
    );
  }

  if (!hasTableOfContents && signals.wordCount >= 900) {
    actions.push(
      createAction({
        impact: 4,
        ease: 7,
        action: "Add a table of contents or jump links for longer informational articles.",
        whyItMatters:
          "A table of contents helps readers scan the article and reach the section they need faster."
      })
    );
  }

  if (
    hasFaqCoverage &&
    !signals.topicSignals.includes("PAA-style question coverage")
  ) {
    actions.push(
      createAction({
        impact: 5,
        ease: 6,
        action: "Add PAA-style question sections that answer follow-up reader questions.",
        whyItMatters:
          "Question-led sections help informational articles cover related search intent more completely."
      })
    );
  }

  if (!hasExamples) {
    actions.push(
      createAction({
        impact: 5,
        ease: 6,
        action: "Add examples, checklists, comparison tables, or step-by-step tutorial sections.",
        whyItMatters:
          "Concrete examples and structured formats make informational content easier to use and more distinctive."
      })
    );
  }

  if (!hasCitations) {
    actions.push(
      createAction({
        impact: 5,
        ease: 5,
        action: "Add citations, references, or useful supporting resources.",
        whyItMatters:
          "Citations and resources strengthen editorial trust and give readers paths to verify or explore claims."
      })
    );
  }

  actions.push(
    ...(hasMedia
      ? []
      : [
          createAction({
            impact: 4,
            ease: 5,
            action:
              "Improve media richness with helpful images, screenshots, diagrams, video, or summary tables.",
            whyItMatters:
              "Media-rich articles are easier to scan, understand, and reuse."
          })
        ])
  );

  if (!hasPrimaryArticleSchema) {
    actions.push(
      createAction({
        impact: 5,
        ease: 5,
        action: "Add Article, BlogPosting, or HowTo schema where appropriate.",
        whyItMatters:
          "Article-specific schema clarifies informational content without relying on sitewide business schema."
      })
    );
  }

  return actions
    .filter(
      (action, index, allActions) =>
        allActions.findIndex((item) => item.action === action.action) === index
    )
    .sort((a, b) => b.estimatedScoreGain - a.estimatedScoreGain);
}

function createAffiliatePrioritizedActions(
  input: ScoringInput,
  signals: ExtractedSignals
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];
  const pageText = `${input.text ?? ""}\n${input.html ?? ""}`;
  const schemaSource = input.schemaJson ?? "";
  const detectedInternalLinks = [
    ...(input.relatedInternalLinks ?? []),
    ...extractInternalLinksFromHtml(input.websiteUrl, input.html)
  ];
  const schemaTypes = new Set(signals.schemaTypes);
  const hasComparison = signals.topicSignals.includes(
    "Comparison tables/criteria"
  );
  const hasProsCons = signals.topicSignals.includes("Pros and cons");
  const hasBestFor = signals.topicSignals.includes("Best-for sections");
  const hasBuyerGuide = signals.topicSignals.includes("Buyer guide sections");
  const hasPricing = signals.topicSignals.includes("Pricing/value language");
  const hasAffiliateDisclosure =
    signals.affiliateChecks?.visibleAffiliateDisclosurePresent ||
    signals.trustSignals.includes("Affiliate disclosure") ||
    /\b(?:affiliate disclosure|affiliate links?|as an amazon associate|earns from qualifying purchases|commission at no extra cost|we may earn (?:a )?commission|sponsored links?|paid links?|reader-supported)\b/i.test(
      pageText
    );
  const hasExpertise = signals.trustSignals.includes("Author/reviewer expertise");
  const hasTesting = signals.trustSignals.includes(
    "First-hand testing/review wording"
  );
  const hasFaqCoverage = signals.trustSignals.includes("FAQs");
  const hasRelevantInternalLinks =
    hasRelevantAffiliateInternalLinks(detectedInternalLinks) ||
    /\b(?:related reviews|related comparisons|buying guides|best-of roundups)\b/i.test(
      pageText
    );
  const hasProductSchema = schemaTypes.has("Product");
  const hasReviewSchema = schemaTypes.has("Review");
  const hasItemListSchema = schemaTypes.has("ItemList");
  const hasFaqSchema = schemaTypes.has("FAQPage");
  const hasCleanComparisonSchema =
    signals.affiliateChecks?.cleanComparisonSchemaPresent ||
    (hasItemListSchema && hasFaqSchema && !hasProductSchema);
  const hasIneligibleProductSchema =
    signals.affiliateChecks?.productSchemaMayBeIneligible ?? false;

  if (!signals.titleKeywordMatch) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: "Make the buyer-intent topic clear in the page title.",
        whyItMatters:
          "Affiliate pages need an obvious buyer-intent promise so readers know the page covers products, reviews, comparisons, or buying guidance."
      })
    );
  }

  if (!hasComparison) {
    actions.push(
      createAction({
        impact: 8,
        ease: 6,
        action: "Add a comparison table with clear buyer criteria.",
        whyItMatters:
          "Comparison tables help readers compare options quickly and make affiliate content more useful for buyer-intent searches."
      })
    );
  }

  if (!hasProsCons) {
    actions.push(
      createAction({
        impact: 7,
        ease: 7,
        action: "Add pros and cons for each major product or option.",
        whyItMatters:
          "Pros and cons make the page more transparent and help readers decide which option fits their needs."
      })
    );
  }

  if (!hasBestFor) {
    actions.push(
      createAction({
        impact: 7,
        ease: 7,
        action: "Add 'best for' labels to clarify which product suits which buyer.",
        whyItMatters:
          "Best-for labels turn broad recommendations into practical buying guidance."
      })
    );
  }

  if (!hasBuyerGuide) {
    actions.push(
      createAction({
        impact: 7,
        ease: 6,
        action: "Add a buyer guide section explaining how to choose.",
        whyItMatters:
          "Buyer guide sections improve decision support and reduce thin roundup-style content."
      })
    );
  }

  if (!hasAffiliateDisclosure) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: "Add a clear affiliate disclosure near the top of the page.",
        whyItMatters:
          "Affiliate disclosures build reader trust and support transparent monetised content."
      })
    );
  }

  if (!hasExpertise) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: "Add author or reviewer expertise details.",
        whyItMatters:
          "Reviewer credentials help readers understand why they should trust the recommendations."
      })
    );
  }

  if (!hasTesting) {
    actions.push(
      createAction({
        impact: 6,
        ease: 5,
        action: "Add first-hand testing notes where accurate.",
        whyItMatters:
          "First-hand review details make affiliate recommendations more credible than generic product summaries."
      })
    );
  }

  if (!hasPricing) {
    actions.push(
      createAction({
        impact: 5,
        ease: 6,
        action: "Add price, value, or budget guidance.",
        whyItMatters:
          "Pricing and value context helps readers decide which option is realistic for their budget."
      })
    );
  }

  if (!hasFaqCoverage) {
    actions.push(
      createAction({
        impact: 5,
        ease: 7,
        action: "Add a short FAQ section for buyer questions.",
        whyItMatters:
          "FAQs help answer late-stage buying questions and can support FAQPage schema where appropriate."
      })
    );
  }

  if (!hasRelevantInternalLinks) {
    actions.push(
      createAction({
        impact: 5,
        ease: 6,
        action:
          "Add internal links to relevant reviews, comparisons, roundups, or buying guides.",
        whyItMatters:
          "Relevant affiliate internal links help readers compare related options without sending them to unrelated local pages."
      })
    );
  }

  if (!hasProductSchema && !hasReviewSchema && !hasItemListSchema && !hasFaqSchema) {
    actions.push(
      createAction({
        impact: 6,
        ease: 5,
        action:
          "Add ItemList schema for comparison content, or Product/Review schema only where valid visible offer, rating, or review data exists. Only add FAQPage schema if visible FAQs are added first.",
        whyItMatters:
          "Affiliate-friendly schema should clarify products, lists, and FAQs without creating invalid Product snippets."
      })
    );
  } else if (hasIneligibleProductSchema) {
    actions.push(
      createAction({
        impact: 3,
        ease: 5,
        action:
          "Review Product schema eligibility before using Product snippets.",
        whyItMatters:
          "Product schema detected, but it may not be eligible for Google Product snippets unless valid offers, review, or aggregateRating data is present. Do not add fake values."
      })
    );
  } else if (hasCleanComparisonSchema) {
    actions.push(
      createAction({
        impact: 2,
        ease: 5,
        action:
          "Schema appears suitable for a comparison article. Product or Review schema should only be added if the page contains visible, valid offer, rating, or review data.",
        whyItMatters:
          "Clean ItemList and FAQPage schema can be safer for comparison articles than invalid nested Product snippets."
      })
    );
  } else if (countSchemaTypes(schemaSource) > 1) {
    actions.push(
      createAction({
        impact: 3,
        ease: 5,
        action:
          "Review affiliate schema blocks for eligibility and consistency.",
        whyItMatters:
          "Product or Review schema should only be added when visible, valid offer, rating, or review data supports it."
      })
    );
  }

  return actions
    .filter(
      (action, index, allActions) =>
        allActions.findIndex((item) => item.action === action.action) === index
    )
    .sort((a, b) => b.estimatedScoreGain - a.estimatedScoreGain);
}

function createSaasPrioritizedActions(
  input: ScoringInput,
  signals: ExtractedSignals
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];
  const pageText = `${input.text ?? ""}\n${input.html ?? ""}`;
  const schemaSource = input.schemaJson ?? "";
  const detectedInternalLinks = [
    ...(input.relatedInternalLinks ?? []),
    ...extractInternalLinksFromHtml(input.websiteUrl, input.html)
  ];
  const schemaTypes = new Set(signals.schemaTypes);
  const isComparisonPage = isSaasComparisonPage(input);
  const hasProductPositioning = signals.topicSignals.includes("Product name/entities");
  const hasFeatures = signals.topicSignals.includes("Features");
  const hasBenefits = signals.topicSignals.includes("Benefits");
  const hasUseCases = signals.topicSignals.includes("Use cases/personas");
  const hasIntegrations = signals.topicSignals.includes("Integrations");
  const hasPricingOrDemo = signals.topicSignals.includes(
    "Pricing/free trial/demo language"
  );
  const hasComparison = signals.topicSignals.includes(
    "Comparison/alternatives content"
  );
  const hasOnboarding = signals.topicSignals.includes("Onboarding/setup content");
  const hasVisuals = signals.topicSignals.includes("Screenshots/product visuals");
  const hasTestimonials = signals.trustSignals.includes(
    "Testimonials/case studies"
  );
  const hasSecurity = signals.trustSignals.includes(
    "Security/compliance trust signals"
  );
  const hasFaqCoverage = signals.trustSignals.includes("FAQs");
  const hasRelevantInternalLinks =
    hasRelevantSaasInternalLinks(detectedInternalLinks) ||
    /\b(?:features|pricing|integrations|docs|help center|help centre|use cases|alternatives)\b/i.test(
      pageText
    );
  const supportedSchemaTypes = isComparisonPage
    ? ["Article", "ItemList", "Product", "FAQPage"]
    : [
        "SoftwareApplication",
        "Product",
        "Organization",
        "BreadcrumbList",
        "FAQPage"
      ];
  const hasSaasSchema = supportedSchemaTypes.some((type) => schemaTypes.has(type));
  const hasPositioningEvidence =
    hasProductPositioning &&
    signals.topicSignals.length >= 4 &&
    [
      input.title ?? "",
      ...(input.headings?.h1 ?? []),
      ...(input.headings?.h2 ?? [])
    ].some((value) =>
      /\b(?:software|platform|app|product|tool|workspace|suite|solution|feature|features|project management|crm|analytics|automation)\b/i.test(
        value
      )
    );

  if (isComparisonPage && (!signals.titleKeywordMatch || !hasComparison)) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: "Clarify the comparison angle and who each tool is best for.",
        whyItMatters:
          "SaaS comparison and review pages need to explain which tools are being compared, the criteria used, and which use cases each option fits."
      })
    );
  } else if (
    (!signals.titleKeywordMatch || !hasProductPositioning) &&
    !hasPositioningEvidence
  ) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: "Add clear SaaS product positioning.",
        whyItMatters:
          "SaaS pages need to quickly explain what the product is, who it is for, and what problem it solves."
      })
    );
  }

  if (isComparisonPage && !hasComparison) {
    actions.push(
      createAction({
        impact: 8,
        ease: 6,
        action: "Add comparison criteria and a feature comparison section.",
        whyItMatters:
          "Comparison criteria help readers understand why each SaaS tool is recommended and how the options differ."
      })
    );
  }

  if (!hasFeatures) {
    actions.push(
      createAction({
        impact: 8,
        ease: 7,
        action: isComparisonPage
          ? "Add key features compared across the SaaS tools."
          : "Add clear product feature sections.",
        whyItMatters:
          isComparisonPage
            ? "Feature comparison helps readers evaluate the tools on equal terms."
            : "Feature sections help prospects understand what the product actually does."
      })
    );
  }

  if (!hasBenefits) {
    actions.push(
      createAction({
        impact: 6,
        ease: 7,
        action: "Add benefit-led copy that explains the outcomes users get.",
        whyItMatters:
          "Benefits connect product features to practical business value."
      })
    );
  }

  if (!hasUseCases) {
    actions.push(
      createAction({
        impact: 7,
        ease: 6,
        action: isComparisonPage
          ? "Add best-fit or use-case labels for each SaaS tool."
          : "Add use-case, industry, or persona sections.",
        whyItMatters:
          isComparisonPage
            ? "Best-fit labels help readers decide which tool suits their team, budget, or workflow."
            : "Use-case sections help the page match more SaaS search intent and show who the product is built for."
      })
    );
  }

  if (!hasPricingOrDemo) {
    actions.push(
      createAction({
        impact: 8,
        ease: 8,
        action: isComparisonPage
          ? "Add pricing and free trial comparison detail."
          : "Add pricing, free trial, demo, signup, or contact sales CTA wording.",
        whyItMatters:
          isComparisonPage
            ? "Pricing and trial differences are key decision factors on SaaS comparison pages."
            : "SaaS visitors need a clear next step when evaluating a product."
      })
    );
  }

  if (!hasIntegrations) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: isComparisonPage
          ? "Add integrations compared across the SaaS tools."
          : "Add an integrations section where accurate.",
        whyItMatters:
          isComparisonPage
            ? "Integration coverage helps readers understand which option fits their existing stack."
            : "Integrations help buyers understand how the product fits into their existing stack."
      })
    );
  }

  if (!isComparisonPage && !hasComparison) {
    actions.push(
      createAction({
        impact: 5,
        ease: 5,
        action: "Add comparison or alternatives content where relevant.",
        whyItMatters:
          "Comparison and alternatives sections help SaaS pages satisfy evaluation-stage searches."
      })
    );
  }

  if (!hasOnboarding) {
    actions.push(
      createAction({
        impact: 4,
        ease: 6,
        action: isComparisonPage
          ? "Add setup or onboarding notes for each SaaS option."
          : "Add onboarding, setup, or implementation detail.",
        whyItMatters:
          isComparisonPage
            ? "Setup notes help readers compare adoption effort between tools."
            : "Setup information reduces friction for prospects wondering how hard the product is to adopt."
      })
    );
  }

  if (!hasVisuals) {
    actions.push(
      createAction({
        impact: 6,
        ease: 5,
        action: isComparisonPage
          ? "Add screenshots for each SaaS option where available."
          : "Add screenshots or product visuals.",
        whyItMatters:
          isComparisonPage
            ? "Screenshots make SaaS comparisons more concrete and easier to trust."
            : "Product visuals help prospects understand the interface before requesting a demo or trial."
      })
    );
  }

  if (!isComparisonPage && !hasTestimonials) {
    actions.push(
      createAction({
        impact: 6,
        ease: 4,
        action: "Add testimonials or case studies only if real and approved.",
        whyItMatters:
          "Real customer proof helps SaaS prospects trust the product, but invented claims create legal and credibility risk."
      })
    );
  }

  if (!hasSecurity) {
    actions.push(
      createAction({
        impact: 5,
        ease: 5,
        action: "Add security or compliance details where accurate.",
        whyItMatters:
          "Security and compliance details reduce risk concerns for SaaS buyers."
      })
    );
  }

  if (!hasFaqCoverage) {
    actions.push(
      createAction({
        impact: 5,
        ease: 7,
        action: "Add a short FAQ section for SaaS evaluation questions.",
        whyItMatters:
          "FAQs can answer product, pricing, setup, integration, and support questions."
      })
    );
  }

  if (!hasRelevantInternalLinks) {
    actions.push(
      createAction({
        impact: 5,
        ease: 6,
        action:
          "Add internal links to relevant features, pricing, integrations, docs, comparisons, alternatives, or use-case pages.",
        whyItMatters:
          "Relevant SaaS internal links help prospects continue evaluation and help search engines understand product architecture."
      })
    );
  }

  if (!hasSaasSchema) {
    actions.push(
      createAction({
        impact: 6,
        ease: 5,
        action:
          isComparisonPage
            ? "Add Article, ItemList, Product, or FAQPage schema where appropriate."
            : "Add SoftwareApplication, Product, Organization, BreadcrumbList, or FAQPage schema where appropriate.",
        whyItMatters:
          isComparisonPage
            ? "Comparison-friendly schema clarifies the article, ranked list, products, and visible FAQ content."
            : "SaaS-friendly schema clarifies the product, organization, navigation, and visible FAQ content."
      })
    );
  } else if (countSchemaTypes(schemaSource) > 1) {
    actions.push(
      createAction({
        impact: 3,
        ease: 5,
        action:
          "Review SaaS schema blocks for consistency across SoftwareApplication, Product, Organization, BreadcrumbList, and FAQPage markup.",
        whyItMatters:
          "Consistent SaaS schema reduces conflicting product or organization data."
      })
    );
  }

  return actions
    .filter(
      (action, index, allActions) =>
        allActions.findIndex((item) => item.action === action.action) === index
    )
    .sort((a, b) => b.estimatedScoreGain - a.estimatedScoreGain);
}

export function createPrioritizedActions(
  input: ScoringInput,
  signals: ExtractedSignals
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];
  const intentMode = getIntentMode(input);

  if (intentMode === "blog-media") {
    return createBlogMediaPrioritizedActions(input, signals);
  }

  if (intentMode === "affiliate") {
    return createAffiliatePrioritizedActions(input, signals);
  }

  if (intentMode === "saas") {
    return createSaasPrioritizedActions(input, signals);
  }

  const pageText = `${input.text ?? ""}\n${input.html ?? ""}`;
  const schemaSource = input.schemaJson ?? "";
  const hasFaqContent = includesAny(pageText, [
    "faq",
    "frequently asked",
    "questions"
  ]);
  const hasFaqSchema = signals.schemaTypes.includes("FAQPage");
  const hasLocalBusinessSchema = signals.schemaTypes.includes("LocalBusiness");
  const hasAreaServed = /"areaServed"\s*:/i.test(schemaSource);
  const hasOpeningHours = /"openingHours"\s*:/i.test(schemaSource);
  const hasInternalLinks =
    /href=["']\/|href=["'][^"']*(service|repair|area|location)/i.test(
      input.html ?? ""
    );

  if (signals.headings.h1.length === 0) {
    actions.push(
      createAction({
        impact: 9,
        ease: 8,
        action: "Add one clear H1 heading that includes the main service and location.",
        whyItMatters:
          "The H1 helps search engines and visitors understand the main purpose of the page quickly."
      })
    );
  }

  if (!hasLocalBusinessSchema) {
    actions.push(
      createAction({
        impact: 9,
        ease: 6,
        action: "Add LocalBusiness schema.",
        whyItMatters:
          "LocalBusiness schema gives search engines structured details about the business, service area, and contact information."
      })
    );
  }

  if (!signals.titleKeywordMatch) {
    actions.push(
      createAction({
        impact: 9,
        ease: 8,
        action: "Add the target keyword to the page title.",
        whyItMatters:
          "A focused title is one of the clearest relevance signals for the target search."
      })
    );
  }

  if (signals.locationMentionCount === 0) {
    actions.push(
      createAction({
        impact: 9,
        ease: 8,
        action: "Mention the target location in the page content.",
        whyItMatters:
          "Local pages need clear location signals to connect the service with the search area."
      })
    );
  }

  if (hasFaqContent && !hasFaqSchema) {
    actions.push(
      createAction({
        impact: 7,
        ease: 6,
        action: "Add FAQPage schema for the visible FAQ content.",
        whyItMatters:
          "FAQPage schema helps search engines understand question-and-answer content that already exists on the page."
      })
    );
  } else if (!hasFaqContent) {
    actions.push(
      createAction({
        impact: 4,
        ease: 7,
        action: "Expand the page with a short FAQ section.",
        whyItMatters:
          "FAQs can answer objections, add useful long-tail content, and support local intent."
      })
    );
  }

  if (hasLocalBusinessSchema && !hasAreaServed) {
    actions.push(
      createAction({
        impact: 6,
        ease: 7,
        action: `Add areaServed to LocalBusiness schema${
          input.location ? ` for ${input.location}` : ""
        }.`,
        whyItMatters:
          "The areaServed field reinforces which local area the business covers."
      })
    );
  }

  if (hasLocalBusinessSchema && !hasOpeningHours) {
    actions.push(
      createAction({
        impact: 4,
        ease: 6,
        action: "Improve schema completeness by adding openingHours.",
        whyItMatters:
          "More complete schema can make the business details clearer and more reliable."
      })
    );
  }

  if (countSchemaTypes(schemaSource) > 1) {
    actions.push(
      createAction({
        impact: 5,
        ease: 5,
        action: "Review multiple schema blocks and consolidate where sensible.",
        whyItMatters:
          "Cleaner structured data is easier to maintain and reduces the chance of conflicting business details."
      })
    );
  }

  if (signals.trustSignals.length < 3) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action:
          "Add more testimonials, guarantees, reviews, or named technician details.",
        whyItMatters:
          "Trust proof helps visitors feel confident enough to contact the business."
      })
    );
  }

  if (!hasInternalLinks) {
    actions.push(
      createAction({
        impact: 6,
        ease: 6,
        action: "Add internal links to related service or location pages.",
        whyItMatters:
          "Internal links help visitors discover related services and help search engines understand page relationships."
      })
    );
  }

  if (signals.wordCount < 500) {
    actions.push(
      createAction({
        impact: 6,
        ease: 5,
        action: "Strengthen service coverage with more detail about problems solved, process, and service areas.",
        whyItMatters:
          "More useful service coverage can improve relevance and answer more customer questions."
      })
    );
  }

  if (
    signals.metaDescriptionKeywordMatch &&
    signals.metaDescriptionLocationMatch
  ) {
    actions.push(
      createAction({
        impact: 3,
        ease: 7,
        action: "Improve meta wording with a stronger benefit and call to action.",
        whyItMatters:
          "A clearer meta description can improve click-through even when the basics are already covered."
      })
    );
  }

  if (signals.locationMentionCount > 0 && signals.locationMentionCount < 3) {
    actions.push(
      createAction({
        impact: 3,
        ease: 6,
        action: "Add one or two more natural local mentions, such as nearby areas or case studies.",
        whyItMatters:
          "Natural local detail can strengthen relevance without keyword stuffing."
      })
    );
  }

  actions.push(
    createAction({
      impact: 4,
      ease: 5,
      action: "Add a location-specific case study or recent example job.",
      whyItMatters:
        "Case studies give the page unique local proof beyond generic service copy."
    })
  );

  return actions
    .filter(
      (action, index, allActions) =>
        allActions.findIndex((item) => item.action === action.action) === index
    )
    .map((action) => adjustActionForIntentMode(action, intentMode))
    .filter(
      (action, index, allActions) =>
        allActions.findIndex((item) => item.action === action.action) === index
    )
    .sort((a, b) => b.estimatedScoreGain - a.estimatedScoreGain);
}
