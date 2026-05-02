"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { ScoreResult } from "../lib/scoring/types";

type FormState = {
  keyword: string;
  location: string;
  title: string;
  metaDescription: string;
  websiteUrl: string;
  pageContent: string;
  schemaJson: string;
};

const initialFormState: FormState = {
  keyword: "",
  location: "",
  title: "",
  metaDescription: "",
  websiteUrl: "",
  pageContent: "",
  schemaJson: ""
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

export default function Home() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
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
            <input
              name="websiteUrl"
              onChange={(event) =>
                updateField("websiteUrl", event.target.value)
              }
              placeholder="https://example.com/service-page"
              type="url"
              value={form.websiteUrl}
            />
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

        <button disabled={isLoading} type="submit">
          {isLoading ? "Scoring..." : "Score Page"}
        </button>

        {error ? <p className="error">{error}</p> : null}
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
