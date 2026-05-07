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

  if (signals.schemaTypes.length === 0) {
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
  const hasExamples = signals.trustSignals.includes(
    "Examples/tutorial style content"
  );
  const hasCitations = signals.trustSignals.includes("Citations/resources");

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
    createAction({
      impact: 4,
      ease: 5,
      action: "Improve media richness with helpful images, screenshots, diagrams, video, or summary tables.",
      whyItMatters:
        "Media-rich articles are easier to scan, understand, and reuse."
    })
  );

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
