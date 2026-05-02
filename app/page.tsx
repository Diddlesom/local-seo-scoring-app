"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { generateAiTaskPack } from "../lib/report/generate-ai-task-pack";
import { generateDeveloperReport } from "../lib/report/generate-report";
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

function ResultList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="empty">Nothing found yet.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
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
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    setResult(null);
  }

  async function handleFetchUrl() {
    setError("");
    setFetchMessage("");
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
    } catch {
      setError("Something went wrong while scoring the page.");
    } finally {
      setIsLoading(false);
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
      result
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
      result
    });

    downloadTextFile(taskPack, createAiTaskPackFileName(form.websiteUrl));
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Local SEO Scoring App</h1>
        <p>
          Paste the basics from one page, then score it for simple local SEO
          coverage.
        </p>
      </header>

      <form className="score-form" onSubmit={handleSubmit}>
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
                className="secondary-button"
                disabled={isFetching}
                onClick={handleFetchUrl}
                type="button"
              >
                {isFetching ? "Fetching..." : "Fetch URL"}
              </button>
            </span>
          </label>
        </div>

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
          <button disabled={isLoading} type="submit">
            {isLoading ? "Scoring..." : "Score Page"}
          </button>
          <button
            className="secondary-button"
            onClick={loadExample}
            type="button"
          >
            Load Example
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {fetchMessage ? <p className="success">{fetchMessage}</p> : null}
      </form>

      {result ? (
        <section className="results" aria-live="polite">
          <div className="score-summary">
            <div>
              <span className="summary-label">Total score</span>
              <strong>{result.totalScore}/100</strong>
            </div>
            <div>
              <span className="summary-label">Grade</span>
              <strong>{result.grade}</strong>
            </div>
          </div>

          <div className="result-actions">
            <button onClick={exportDeveloperReport} type="button">
              Export Developer Report
            </button>
            <button onClick={exportAiTaskPack} type="button">
              Export AI Task Pack
            </button>
          </div>

          <section className="panel">
            <h2>Category Scores</h2>
            <div className="score-list">
              {Object.entries(result.categoryScores).map(([key, score]) => (
                <div className="score-row" key={key}>
                  <span>
                    {categoryLabels[key as keyof ScoreResult["categoryScores"]]}
                  </span>
                  <strong>{score}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Recommended Actions</h2>
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
            <section className="panel">
              <h2>Strengths</h2>
              <ResultList items={result.strengths} />
            </section>

            <section className="panel">
              <h2>Weaknesses</h2>
              <ResultList items={result.weaknesses} />
            </section>

            <section className="panel">
              <h2>Missing Items</h2>
              <ResultList items={result.missingItems} />
            </section>

            <section className="panel">
              <h2>Evidence Items</h2>
              <ResultList items={result.evidenceItems} />
            </section>
          </div>
        </section>
      ) : null}
    </main>
  );
}
