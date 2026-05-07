import { extractSignals } from "./extractors";
import {
  createPrioritizedActions,
  createPriorityActions
} from "./priority-engine";
import type {
  CategoryScores,
  IntentMode,
  ScoreResult,
  ScoringInput
} from "./types";

function getGrade(totalScore: number): ScoreResult["grade"] {
  if (totalScore >= 85) {
    return "A";
  }

  if (totalScore >= 70) {
    return "B";
  }

  if (totalScore >= 55) {
    return "C";
  }

  if (totalScore >= 40) {
    return "D";
  }

  return "F";
}

function createCategoryScores(
  signals: ReturnType<typeof extractSignals>
): CategoryScores {
  const localSchemaTypes = signals.schemaTypes.filter((type) =>
    ["LocalBusiness", "Service", "FAQPage"].includes(type)
  );

  return {
    content: signals.wordCount >= 500 ? 15 : signals.wordCount >= 250 ? 10 : 5,
    headings:
      signals.headings.h1.length > 0 &&
      (signals.headings.h2.length > 0 || signals.headings.h3.length > 0)
        ? 15
        : signals.headings.h1.length > 0
          ? 10
          : 0,
    metadata:
      (signals.titleKeywordMatch ? 8 : 0) +
      (signals.metaDescriptionKeywordMatch ? 6 : 0) +
      (signals.metaDescriptionLocationMatch ? 6 : 0),
    localSignals:
      (signals.locationMentionCount > 0 ? 8 : 0) +
      (signals.hasPhoneNumber ? 7 : 0),
    trust: Math.min(signals.trustSignals.length * 2, 10),
    conversion: Math.min(signals.ctaWords.length * 3, 10),
    schema: Math.min(localSchemaTypes.length * 5, 15)
  };
}

function getIntentMode(input: ScoringInput): IntentMode {
  return input.intentMode ?? "local-seo";
}

function createBlogMediaCategoryScores(
  signals: ReturnType<typeof extractSignals>
): CategoryScores {
  return {
    content: signals.wordCount >= 900 ? 15 : signals.wordCount >= 500 ? 10 : 5,
    headings:
      signals.headings.h1.length > 0 &&
      signals.headings.h2.length + signals.headings.h3.length >= 3
        ? 15
        : signals.headings.h1.length > 0
          ? 10
          : 0,
    metadata:
      (signals.titleKeywordMatch ? 10 : 0) +
      (signals.metaDescriptionKeywordMatch ? 10 : 0),
    localSignals: Math.min(signals.topicSignals.length * 4, 15),
    trust: Math.min(signals.trustSignals.length * 2, 10),
    conversion: Math.min(signals.ctaWords.length * 3, 10),
    schema: Math.min(signals.schemaTypes.length * 5, 15)
  };
}

function createAffiliateCategoryScores(
  signals: ReturnType<typeof extractSignals>
): CategoryScores {
  const affiliateSchemaTypes = signals.schemaTypes.filter((type) =>
    ["Product", "Review", "ItemList", "FAQPage", "Article"].includes(type)
  );

  return {
    content: signals.wordCount >= 1000 ? 15 : signals.wordCount >= 600 ? 10 : 5,
    headings:
      signals.headings.h1.length > 0 &&
      signals.headings.h2.length + signals.headings.h3.length >= 4
        ? 15
        : signals.headings.h1.length > 0
          ? 10
          : 0,
    metadata:
      (signals.titleKeywordMatch ? 10 : 0) +
      (signals.metaDescriptionKeywordMatch ? 10 : 0),
    localSignals: Math.min(signals.topicSignals.length * 3, 15),
    trust: Math.min(signals.trustSignals.length * 2, 10),
    conversion: Math.min(signals.ctaWords.length * 3, 10),
    schema: Math.min(affiliateSchemaTypes.length * 5, 15)
  };
}

function createSaasCategoryScores(
  signals: ReturnType<typeof extractSignals>
): CategoryScores {
  const saasSchemaTypes = signals.schemaTypes.filter((type) =>
    [
      "SoftwareApplication",
      "Product",
      "Organization",
      "BreadcrumbList",
      "FAQPage"
    ].includes(type)
  );

  return {
    content: signals.wordCount >= 900 ? 15 : signals.wordCount >= 500 ? 10 : 5,
    headings:
      signals.headings.h1.length > 0 &&
      signals.headings.h2.length + signals.headings.h3.length >= 4
        ? 15
        : signals.headings.h1.length > 0
          ? 10
          : 0,
    metadata:
      (signals.titleKeywordMatch ? 10 : 0) +
      (signals.metaDescriptionKeywordMatch ? 10 : 0),
    localSignals: Math.min(signals.topicSignals.length * 3, 15),
    trust: Math.min(signals.trustSignals.length * 2, 10),
    conversion: Math.min(signals.ctaWords.length * 3, 10),
    schema: Math.min(saasSchemaTypes.length * 5, 15)
  };
}

function createStrengths(
  signals: ReturnType<typeof extractSignals>,
  categoryScores: CategoryScores,
  intentMode: IntentMode = "local-seo"
): string[] {
  const strengths: string[] = [];
  const localSchemaTypes = signals.schemaTypes.filter((type) =>
    ["LocalBusiness", "Service", "FAQPage"].includes(type)
  );

  if (categoryScores.content >= 10) {
    strengths.push("Page has a useful amount of written content.");
  }

  if (signals.headings.h1.length > 0) {
    strengths.push("Page includes an H1 heading.");
  }

  if (signals.titleKeywordMatch) {
    strengths.push("Page title includes the target keyword.");
  }

  if (intentMode === "blog-media") {
    if (signals.topicSignals.length > 0) {
      strengths.push(
        `Page includes Blog/Media topic signals: ${signals.topicSignals.join(", ")}.`
      );
    }

    if (signals.trustSignals.length > 0) {
      strengths.push(
        `Page includes Blog/Media trust signals: ${signals.trustSignals.join(", ")}.`
      );
    }

    if (signals.schemaTypes.length > 0) {
      strengths.push("Page includes supported schema markup.");
    }

    return strengths;
  }

  if (intentMode === "affiliate") {
    if (signals.topicSignals.length > 0) {
      strengths.push(
        `Page includes Affiliate buyer-intent signals: ${signals.topicSignals.join(", ")}.`
      );
    }

    if (signals.trustSignals.length > 0) {
      strengths.push(
        `Page includes affiliate trust signals: ${signals.trustSignals.join(", ")}.`
      );
    }

    if (signals.schemaTypes.length > 0) {
      strengths.push("Page includes supported schema markup.");
    }

    return strengths;
  }

  if (intentMode === "saas") {
    if (signals.topicSignals.length > 0) {
      strengths.push(
        `Page includes SaaS product/use-case signals: ${signals.topicSignals.join(", ")}.`
      );
    }

    if (signals.trustSignals.length > 0) {
      strengths.push(
        `Page includes SaaS trust signals: ${signals.trustSignals.join(", ")}.`
      );
    }

    if (signals.ctaWords.length > 0) {
      strengths.push("Page includes product-led conversion wording.");
    }

    if (signals.schemaTypes.length > 0) {
      strengths.push("Page includes supported schema markup.");
    }

    return strengths;
  }

  if (signals.locationMentionCount > 0) {
    strengths.push("Page mentions the target location.");
  }

  if (signals.hasPhoneNumber) {
    strengths.push("Page includes a phone number.");
  }

  if (signals.trustSignals.length > 0) {
    strengths.push(
      `Page includes trust signals: ${signals.trustSignals.join(", ")}.`
    );
  }

  if (signals.ctaWords.length > 0) {
    strengths.push("Page includes call-to-action wording.");
  }

  if (localSchemaTypes.length > 0) {
    strengths.push("Page includes supported schema markup.");
  }

  return strengths;
}

function createWeaknesses(
  signals: ReturnType<typeof extractSignals>,
  categoryScores: CategoryScores,
  intentMode: IntentMode = "local-seo"
): string[] {
  const weaknesses: string[] = [];
  const localSchemaTypes = signals.schemaTypes.filter((type) =>
    ["LocalBusiness", "Service", "FAQPage"].includes(type)
  );

  if (categoryScores.content < 10) {
    weaknesses.push("Page content is thin.");
  }

  if (signals.headings.h1.length === 0) {
    weaknesses.push("No H1 heading was found.");
  }

  if (!signals.titleKeywordMatch) {
    weaknesses.push("Page title does not include the target keyword.");
  }

  if (!signals.metaDescriptionKeywordMatch) {
    weaknesses.push("Meta description does not include the target keyword.");
  }

  if (intentMode === "blog-media") {
    if (signals.topicSignals.length < 2) {
      weaknesses.push(
        "Blog/Media topic coverage is light for informational intent."
      );
    }

    if (signals.trustSignals.length < 3) {
      weaknesses.push(
        "Blog/Media trust signals are limited."
      );
    }

    if (signals.ctaWords.length === 0) {
      weaknesses.push("No clear reader next-step wording was found.");
    }

    if (signals.schemaTypes.length === 0) {
      weaknesses.push("No supported schema markup was found.");
    }

    return weaknesses;
  }

  if (intentMode === "affiliate") {
    if (signals.topicSignals.length < 3) {
      weaknesses.push(
        "Affiliate buyer intent coverage is light."
      );
    }

    if (signals.trustSignals.length < 3) {
      weaknesses.push(
        "Affiliate trust signals are limited."
      );
    }

    if (signals.ctaWords.length === 0) {
      weaknesses.push("No clear reader next-step wording was found.");
    }

    if (
      !signals.schemaTypes.some((type) =>
        ["Product", "Review", "ItemList", "FAQPage"].includes(type)
      )
    ) {
      weaknesses.push("No Affiliate-supported schema markup was found.");
    }

    return weaknesses;
  }

  if (intentMode === "saas") {
    if (signals.topicSignals.length < 4) {
      weaknesses.push(
        "SaaS product/use-case coverage is light."
      );
    }

    if (signals.trustSignals.length < 3) {
      weaknesses.push(
        "SaaS trust signals are limited."
      );
    }

    if (signals.ctaWords.length === 0) {
      weaknesses.push("No clear demo, free trial, signup, or sales CTA was found.");
    }

    if (
      !signals.schemaTypes.some((type) =>
        [
          "SoftwareApplication",
          "Product",
          "Organization",
          "BreadcrumbList",
          "FAQPage"
        ].includes(type)
      )
    ) {
      weaknesses.push("No SaaS-supported schema markup was found.");
    }

    return weaknesses;
  }

  if (!signals.metaDescriptionLocationMatch) {
    weaknesses.push("Meta description does not include the target location.");
  }

  if (signals.locationMentionCount === 0) {
    weaknesses.push("Target location is not mentioned in the page content.");
  }

  if (!signals.hasPhoneNumber) {
    weaknesses.push("No phone number was found.");
  }

  if (signals.trustSignals.length === 0) {
    weaknesses.push("No basic trust signals were found.");
  }

  if (signals.ctaWords.length === 0) {
    weaknesses.push("No clear call-to-action wording was found.");
  }

  if (localSchemaTypes.length === 0) {
    weaknesses.push("No supported schema markup was found.");
  }

  return weaknesses;
}

export function scoreLocalSeo(input: ScoringInput): ScoreResult {
  const intentMode = getIntentMode(input);
  const signals = extractSignals(input);
  const actions = createPriorityActions(input, signals);
  const prioritizedActions = createPrioritizedActions(input, signals);
  const categoryScores =
    intentMode === "blog-media"
      ? createBlogMediaCategoryScores(signals)
      : intentMode === "affiliate"
        ? createAffiliateCategoryScores(signals)
        : intentMode === "saas"
          ? createSaasCategoryScores(signals)
      : createCategoryScores(signals);
  const totalScore = Object.values(categoryScores).reduce(
    (total, score) => total + score,
    0
  );

  return {
    categoryScores,
    totalScore,
    grade: getGrade(totalScore),
    strengths: createStrengths(signals, categoryScores, intentMode),
    weaknesses: createWeaknesses(signals, categoryScores, intentMode),
    missingItems: actions.map((action) => action.title),
    prioritizedActions,
    evidenceItems: signals.evidence,
    signals
  };
}
