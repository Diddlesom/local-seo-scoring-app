import type { ExtractedSignals, ScoringInput } from "./types";
import { scoringConfig } from "./config";

function normalise(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function countWords(text: string): number {
  const matches = text.match(/\b[\w'-]+\b/g);
  return matches?.length ?? 0;
}

function extractHeadings(html: string, tag: "h1" | "h2" | "h3"): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const headings: string[] = [];
  let match = pattern.exec(html);

  while (match) {
    headings.push(stripHtml(match[1]).replace(/\s+/g, " ").trim());
    match = pattern.exec(html);
  }

  return headings.filter(Boolean);
}

function includesPhrase(text: string, phrase?: string): boolean {
  const cleanPhrase = normalise(phrase);
  return cleanPhrase.length > 0 && normalise(text).includes(cleanPhrase);
}

function countPhrase(text: string, phrase?: string): number {
  const cleanPhrase = normalise(phrase);

  if (!cleanPhrase) {
    return 0;
  }

  return normalise(text).split(cleanPhrase).length - 1;
}

function findPhoneNumber(text: string): boolean {
  return /(?:\+?\d[\s().-]?){10,}/.test(text);
}

function findMatches(text: string, words: readonly string[]): string[] {
  const cleanText = normalise(text);
  return words.filter((word) => cleanText.includes(word.toLowerCase()));
}

function findSchemaTypes(schemaSource: string): string[] {
  return scoringConfig.schemaTypes.filter((type) =>
    new RegExp(`"@type"\\s*:\\s*"[^"]*${type}[^"]*"`, "i").test(
      schemaSource
    )
  );
}

export function extractSignals(input: ScoringInput): ExtractedSignals {
  const html = input.html ?? "";
  const schemaSource = `${html}\n${input.schemaJson ?? ""}`;
  const pageText = input.text ?? stripHtml(html);
  const title = input.title ?? "";
  const metaDescription = input.metaDescription ?? "";
  const trustSignals = findMatches(pageText, scoringConfig.trustSignalWords);
  const ctaWords = findMatches(pageText, scoringConfig.ctaWords);
  const schemaTypes = findSchemaTypes(schemaSource);
  const locationMentionCount = countPhrase(pageText, input.location);
  const hasPhoneNumber = findPhoneNumber(pageText);
  const titleKeywordMatch = includesPhrase(title, input.keyword);
  const metaDescriptionKeywordMatch = includesPhrase(
    metaDescription,
    input.keyword
  );
  const metaDescriptionLocationMatch = includesPhrase(
    metaDescription,
    input.location
  );
  const wordCount = countWords(pageText);
  const headings = {
    h1: extractHeadings(html, "h1"),
    h2: extractHeadings(html, "h2"),
    h3: extractHeadings(html, "h3")
  };
  const evidence = [
    `Word count: ${wordCount}`,
    `Headings found: ${headings.h1.length} H1, ${headings.h2.length} H2, ${headings.h3.length} H3`,
    `Location mentions: ${locationMentionCount}`,
    hasPhoneNumber ? "Phone number detected" : "No phone number detected",
    trustSignals.length > 0
      ? `Trust signals: ${trustSignals.join(", ")}`
      : "No basic trust signals detected",
    ctaWords.length > 0
      ? `CTA words: ${ctaWords.join(", ")}`
      : "No CTA words detected",
    schemaTypes.length > 0
      ? `Schema types: ${schemaTypes.join(", ")}`
      : "No target schema types detected"
  ];

  return {
    wordCount,
    headings,
    titleKeywordMatch,
    metaDescriptionKeywordMatch,
    metaDescriptionLocationMatch,
    locationMentionCount,
    hasPhoneNumber,
    trustSignals,
    ctaWords,
    schemaTypes,
    evidence
  };
}
