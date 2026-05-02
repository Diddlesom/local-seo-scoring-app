"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { generateAiTaskPack } from "../lib/report/generate-ai-task-pack";
import { generateDeveloperReport } from "../lib/report/generate-report";
import type {
  BenchmarkCompetitor,
  BenchmarkInsights
} from "../lib/report/generate-report";
import { generatePdfReport } from "../lib/report/generate-pdf-report";
import { scoringConfig } from "../lib/scoring/config";
import type { ScoreResult } from "../lib/scoring/types";

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

const initialFormState: FormState = {
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

const exampleFormState: FormState = {
  keyword: "Laptop Repair Chard",
  location: "Chard, Somerset",
  title: "Laptop Repair Chard | Fast Computer Repairs in Somerset",
  metaDescription:
    "Need Laptop Repair Chard? We provide friendly laptop and computer repairs in Chard, Somerset with clear quotes and a warranty.",
  websiteUrl: "https://example.com/laptop-repair-chard",
  pageContent: `<h1>Laptop Repair Chard</h1>
<h2>Fast laptop repairs in Chard, Somerset</h2>
<p>We help homes and small businesses with Laptop Repair Chard services, including slow laptops, broken screens, charging faults, virus removal, data recovery, and Windows setup.</p>
<p>Our local repair service covers Chard, Somerset and nearby villages. Call us today for a clear quote or book a repair visit. We offer honest advice, friendly support, and a warranty on completed repair work.</p>
<h2>Why choose us?</h2>
<p>Customers choose us because we have strong reviews, over 10 years experience, and a no fix no fee approach on selected repairs.</p>
<h3>Get help today</h3>
<p>Contact our Chard laptop repair team on 01460 123456 to get help with your computer problem.</p>`,
  headings: {
    h1: ["Laptop Repair Chard"],
    h2: ["Fast laptop repairs in Chard, Somerset", "Why choose us?"],
    h3: ["Get help today"]
  },
  schemaJson: `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Example Laptop Repair Chard",
  "url": "https://example.com/laptop-repair-chard",
  "telephone": "01460 123456",
  "areaServed": "Chard, Somerset"
}`,
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

const topicKeywords = [
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

function detectTopicsServices(text: string): string[] {
  const cleanText = text.toLowerCase();

  return topicKeywords.filter((topic) => cleanText.includes(topic));
}

function getBenchmarkGaps({
  competitor,
  competitorText,
  targetResult,
  targetText
}: {
  competitor: ScoreResult;
  competitorText: string;
  targetResult: ScoreResult;
  targetText: string;
}): string[] {
  const gaps = new Set<string>();
  const targetTopics = detectTopicsServices(targetText);
  const competitorTopics = detectTopicsServices(competitorText);
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

function formatCompetitorCount(count: number, total: number): string {
  return `${count} of ${total} competitors`;
}

function simplifyBenchmarkGap(gap: string): string {
  const cleanGap = gap.toLowerCase();

  if (cleanGap.includes("deeper page content")) {
    return "Content depth below competitors";
  }

  if (cleanGap.includes("more headings")) {
    return "Page structure has fewer service subheadings";
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

function actionFromGap(gap: string): string {
  const cleanGap = gap.toLowerCase();

  if (cleanGap.includes("content depth")) {
    return "Increase content depth with more useful service detail and local proof.";
  }

  if (cleanGap.includes("trust") || cleanGap.includes("testimonial")) {
    return "Improve trust signals with visible reviews, testimonials, guarantees, or named expert proof.";
  }

  if (cleanGap.includes("coverage")) {
    return `Expand service coverage for ${gap.replace(/^Missing\s+/i, "").replace(/\s+coverage$/i, "")}.`;
  }

  if (cleanGap.includes("schema") || cleanGap.includes("subheadings")) {
    return `Improve page structure: ${gap}.`;
  }

  return `Address competitor gap: ${gap}.`;
}

function getRelativeGap(targetValue: number, averageValue: number): number {
  if (averageValue <= 0) {
    return targetValue <= 0 ? 0 : -1;
  }

  return (averageValue - targetValue) / averageValue;
}

function getTopRecommendedNextStep({
  contentGap,
  trustGap,
  serviceGap,
  averageWordCount
}: {
  contentGap: number;
  trustGap: number;
  serviceGap: number;
  averageWordCount: number;
}): string {
  const gaps = [
    {
      action: `Increase content depth toward the competitor average of ${averageWordCount} words.`,
      gap: contentGap
    },
    {
      action: "Improve trust signals with visible reviews, testimonials, guarantees, or named expert proof.",
      gap: trustGap
    },
    {
      action: "Expand service coverage for important services competitors mention but your page does not.",
      gap: serviceGap
    }
  ].sort((first, second) => second.gap - first.gap);

  return gaps[0].gap > 0
    ? gaps[0].action
    : "Review competitor-backed actions for small improvements; no single major weakness stands out.";
}

function buildBenchmarkInsights({
  competitors,
  targetResult,
  targetText
}: {
  competitors: BenchmarkCompetitor[];
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
  const targetTopics = detectTopicsServices(targetText);
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
  const belowAverageAreas = [
    contentGap > 0 ? "content depth" : "",
    trustGap > 0 ? "trust signals" : "",
    serviceGap > 0 ? "service coverage" : ""
  ].filter(Boolean);
  const priorityActions = uniqueItems([
    ...(targetResult.signals.wordCount < averageWordCount
      ? [
          `Expand content depth toward the competitor average of ${averageWordCount} words with useful service and local detail.`
        ]
      : []),
    ...missingMajorityTopics,
    ...missingMajorityTrustSignals,
    ...missingMajoritySchemaTypes,
    ...keyGaps.map(actionFromGap)
  ]).slice(0, 8);
  const priorityActionGroups = groupPriorityActions(priorityActions);

  return {
    overallCompetitivePosition: [
      contentGap > 0
        ? "Content depth is below the competitor average."
        : "Content depth is competitive against the current benchmark.",
      trustGap > 0
        ? "Trust signals are below the competitor average."
        : "Trust signals are competitive against the current benchmark.",
      serviceGap > 0
        ? "Service coverage is below the competitor average."
        : "Service coverage is competitive against the current benchmark.",
      belowAverageAreas.length > 0
        ? `Summary: your page is behind competitors on ${belowAverageAreas.join(", ")}.`
        : "Summary: your page is broadly competitive against the current competitor set."
    ],
    overallPositionSections: {
      contentDepth:
        contentGap > 0
          ? "Below competitor average."
          : "Competitive with competitor average.",
      trustSignals:
        trustGap > 0
          ? "Below competitor average."
          : "Competitive with competitor average.",
      serviceCoverage:
        serviceGap > 0
          ? "Below competitor average."
          : "Competitive with competitor average.",
      summary:
        belowAverageAreas.length > 0
          ? `Your page is behind competitors on ${belowAverageAreas.join(", ")}.`
          : "Your page is broadly competitive against the current competitor set."
    },
    commonPatterns: [
      ...majorityTopics.map(
        (topic) =>
          `${formatCompetitorCount(topic.count, competitors.length)} mention ${topic.value}.`
      ),
      ...majoritySchemaTypes.map(
        (schema) =>
          `${formatCompetitorCount(schema.count, competitors.length)} use ${schema.value} schema.`
      ),
      ...majorityTrustSignals.map(
        (signal) =>
          `${formatCompetitorCount(signal.count, competitors.length)} show ${signal.value.toLowerCase()}.`
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

function formatIssueText(issue: string): string {
  if (issue.toLowerCase().includes("page content is thin")) {
    return "⚠️ Low content depth detected. Expand service sections and add more local detail to improve rankings.";
  }

  if (
    issue === "Low content depth detected. Add more service detail to improve rankings."
  ) {
    return "⚠️ Low content depth detected. Expand service sections and add more local detail to improve rankings.";
  }

  return issue;
}

function TopIssues({ result }: { result: ScoreResult }) {
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
            <li key={issue}>{formatIssueText(issue)}</li>
          ))}
        </ul>
      ) : (
        <p>
          No major issues found. Review recommended actions for optional
          improvements.
        </p>
      )}
      <p className="why-this-matters">
        Why this matters: Pages with stronger content depth, trust signals, and
        internal linking tend to perform better for local service searches.
      </p>
      <a className="guided-link" href="#recommended-actions">
        View recommended fixes →
      </a>
    </section>
  );
}

function CategoryScoreBar({
  category,
  score
}: {
  category: keyof ScoreResult["categoryScores"];
  score: number;
}) {
  const maxScore = scoringConfig.categoryWeights[category];
  const percentage = Math.min(Math.round((score / maxScore) * 100), 100);

  return (
    <div className="score-bar-row">
      <div className="score-bar-label">
        <span>{categoryLabels[category]}</span>
        <strong>
          {score}
          <small> / {maxScore}</small>
        </strong>
      </div>
      <div
        aria-label={`${categoryLabels[category]} score ${score} out of ${maxScore}`}
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
  const actionGroups = [
    ["Increase content depth", insights.priorityActionGroups.contentDepth],
    ["Improve trust signals", insights.priorityActionGroups.trustSignals],
    ["Expand service coverage", insights.priorityActionGroups.serviceCoverage],
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
            <strong>Service coverage</strong>
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
        {insights.priorityActions.length > 0 ? (
          <div className="benchmark-action-groups">
            {actionGroups.map(([label, actions]) =>
              actions.length > 0 ? (
                <div key={label}>
                  <strong>{label}</strong>
                  <ol>
                    {actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ol>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <p className="empty">No benchmark-driven priority actions found.</p>
        )}
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
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  function updateField(field: TextFormField, value: string) {
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

  async function analyseCompetitorUrl(url: string): Promise<BenchmarkResult> {
    const fetchResponse = await fetch("/api/fetch-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
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

      throw new Error(errorMessage);
    }

    const pageData = fetchedData as FetchedPageData;
    const pageText = pageData.cleanText || pageData.bodyText || pageData.html;
    const scoreResponse = await fetch("/api/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keyword: form.keyword,
        location: form.location,
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        websiteUrl: url,
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
      url,
      title: pageData.title,
      wordCount: competitorScore.signals.wordCount,
      headingsCount: getHeadingsCount(competitorScore),
      schemaTypes: competitorScore.signals.schemaTypes,
      trustSignals: competitorScore.signals.trustSignals,
      topicsServices: detectTopicsServices(pageText),
      gapsFound: result
        ? getBenchmarkGaps({
            competitor: competitorScore,
            competitorText: pageText,
            targetResult: result,
            targetText: form.pageContent
          })
        : []
    };
  }

  async function runCompetitorBenchmark() {
    setError("");
    setBenchmarkMessage("");

    if (!result) {
      setError("Please score the target page before running the benchmark.");
      return;
    }

    const urls = competitorUrls.map((url) => url.trim()).filter(Boolean);

    if (urls.length === 0) {
      setError("Please add at least one competitor URL.");
      return;
    }

    setIsBenchmarking(true);

    try {
      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            return await analyseCompetitorUrl(url);
          } catch (benchmarkError) {
            return {
              url,
              title: "",
              wordCount: 0,
              headingsCount: 0,
              schemaTypes: [],
              trustSignals: [],
              topicsServices: [],
              gapsFound: [],
              error:
                benchmarkError instanceof Error
                  ? benchmarkError.message
                  : "Competitor could not be analysed."
            };
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
      benchmark: completedBenchmarkResults,
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
      benchmark: completedBenchmarkResults,
      benchmarkInsights
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
    (benchmark): benchmark is BenchmarkCompetitor => !benchmark.error
  );
  const benchmarkInsights =
    result && completedBenchmarkResults.length > 0
      ? buildBenchmarkInsights({
          competitors: completedBenchmarkResults,
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
                type="url"
                value={url}
              />
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
                {benchmark.error ? (
                  <p className="error">{benchmark.error}</p>
                ) : (
                  <dl>
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

          <TopIssues result={result} />

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
