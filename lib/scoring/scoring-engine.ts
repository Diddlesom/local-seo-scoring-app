import { extractSignals } from "./extractors";
import { createPriorityActions } from "./priority-engine";
import type { CategoryScores, ScoreResult, ScoringInput } from "./types";

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
    trust: Math.min(signals.trustSignals.length * 3, 10),
    conversion: Math.min(signals.ctaWords.length * 3, 10),
    schema: Math.min(signals.schemaTypes.length * 5, 15)
  };
}

function createStrengths(
  signals: ReturnType<typeof extractSignals>,
  categoryScores: CategoryScores
): string[] {
  const strengths: string[] = [];

  if (categoryScores.content >= 10) {
    strengths.push("Page has a useful amount of written content.");
  }

  if (signals.headings.h1.length > 0) {
    strengths.push("Page includes an H1 heading.");
  }

  if (signals.titleKeywordMatch) {
    strengths.push("Page title includes the target keyword.");
  }

  if (signals.locationMentionCount > 0) {
    strengths.push("Page mentions the target location.");
  }

  if (signals.hasPhoneNumber) {
    strengths.push("Page includes a phone number.");
  }

  if (signals.trustSignals.length > 0) {
    strengths.push("Page includes basic trust signals.");
  }

  if (signals.ctaWords.length > 0) {
    strengths.push("Page includes call-to-action wording.");
  }

  if (signals.schemaTypes.length > 0) {
    strengths.push("Page includes supported schema markup.");
  }

  return strengths;
}

function createWeaknesses(
  signals: ReturnType<typeof extractSignals>,
  categoryScores: CategoryScores
): string[] {
  const weaknesses: string[] = [];

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

  if (signals.schemaTypes.length === 0) {
    weaknesses.push("No supported schema markup was found.");
  }

  return weaknesses;
}

export function scoreLocalSeo(input: ScoringInput): ScoreResult {
  const signals = extractSignals(input);
  const actions = createPriorityActions(signals);
  const categoryScores = createCategoryScores(signals);
  const totalScore = Object.values(categoryScores).reduce(
    (total, score) => total + score,
    0
  );

  return {
    categoryScores,
    totalScore,
    grade: getGrade(totalScore),
    strengths: createStrengths(signals, categoryScores),
    weaknesses: createWeaknesses(signals, categoryScores),
    missingItems: actions.map((action) => action.title),
    evidenceItems: signals.evidence,
    signals
  };
}
