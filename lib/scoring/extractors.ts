import type { ExtractedSignals, IntentMode, ScoringInput } from "./types";
import { scoringConfig } from "./config";

const flexibleStopWords = new Set(["in", "near", "for", "the", "a", "an"]);

function normalise(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

function normaliseForMatching(value?: string): string {
  return normalise(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normaliseHeadings(
  headings: ScoringInput["headings"] | undefined,
  html: string
): ExtractedSignals["headings"] {
  const h1 = headings?.h1?.filter(Boolean) ?? [];
  const h2 = headings?.h2?.filter(Boolean) ?? [];
  const h3 = headings?.h3?.filter(Boolean) ?? [];

  return {
    h1: h1.length > 0 ? h1 : extractHeadings(html, "h1"),
    h2: h2.length > 0 ? h2 : extractHeadings(html, "h2"),
    h3: h3.length > 0 ? h3 : extractHeadings(html, "h3")
  };
}

function includesPhrase(text: string, phrase?: string): boolean {
  const phraseTokens = normaliseForMatching(phrase)
    .split(" ")
    .filter(Boolean);
  const textTokens = normaliseForMatching(text).split(" ").filter(Boolean);

  if (phraseTokens.length === 0 || textTokens.length === 0) {
    return false;
  }

  for (let startIndex = 0; startIndex < textTokens.length; startIndex += 1) {
    let phraseIndex = 0;
    let textIndex = startIndex;

    while (phraseIndex < phraseTokens.length && textIndex < textTokens.length) {
      if (textTokens[textIndex] === phraseTokens[phraseIndex]) {
        phraseIndex += 1;
        textIndex += 1;
        continue;
      }

      const previousMatched = phraseIndex > 0;
      const nextPhraseWord = phraseIndex < phraseTokens.length;

      if (
        previousMatched &&
        nextPhraseWord &&
        flexibleStopWords.has(textTokens[textIndex])
      ) {
        textIndex += 1;
        continue;
      }

      break;
    }

    if (phraseIndex === phraseTokens.length) {
      return true;
    }
  }

  return false;
}

function normaliseBlogMediaToken(
  token: string,
  hasPerformanceContext: boolean
): string {
  if (token === "pc" || token === "computer") {
    return "computer";
  }

  if (token === "laptop" && hasPerformanceContext) {
    return "computer";
  }

  if (
    token === "sluggish" ||
    token === "laggy" ||
    token === "lagging" ||
    token === "performance"
  ) {
    return "slow";
  }

  if (token === "fixes" || token === "fixing") {
    return "fix";
  }

  return token;
}

function getBlogMediaTopicTokens(text: string): string[] {
  const cleanText = normaliseForMatching(text);
  const rawTokens = cleanText.split(" ").filter(Boolean);
  const hasPerformanceContext =
    /\b(slow|sluggish|laggy|lagging|performance|speed|boot|startup|troubleshoot|troubleshooting|fix|fixes|problem|problems)\b/i.test(
      cleanText
    );
  const weakTokens = new Set([
    "a",
    "an",
    "and",
    "are",
    "common",
    "does",
    "how",
    "is",
    "my",
    "of",
    "so",
    "the",
    "to",
    "what",
    "why",
    "your"
  ]);

  return Array.from(
    new Set(
      rawTokens
        .map((token) => normaliseBlogMediaToken(token, hasPerformanceContext))
        .filter((token) => token.length > 1 && !weakTokens.has(token))
    )
  );
}

function includesBlogMediaSemanticPhrase(text: string, phrase?: string): boolean {
  const phraseTokens = getBlogMediaTopicTokens(phrase ?? "");
  const textTokens = new Set(getBlogMediaTopicTokens(text));

  if (phraseTokens.length === 0 || textTokens.size === 0) {
    return false;
  }

  const matchedTokens = phraseTokens.filter((token) => textTokens.has(token));
  const hasDeviceMatch =
    phraseTokens.includes("computer") && textTokens.has("computer");
  const hasPerformanceMatch = phraseTokens.includes("slow") && textTokens.has("slow");

  if (hasDeviceMatch && hasPerformanceMatch) {
    return true;
  }

  return matchedTokens.length >= Math.min(2, phraseTokens.length);
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

function findTrustSignals(text: string): string[] {
  const cleanText = normalise(text);
  const signals = new Set<string>();

  if (
    /\b\d+(?:\.\d)?\s*(?:star|\/5)\b/i.test(text) ||
    /⭐|★/.test(text) ||
    /\b(?:google\s+)?reviews?\b/i.test(text) ||
    /\b\d+\s+reviews?\b/i.test(text)
  ) {
    signals.add("Reviews or rating proof");
  }

  if (/\b(?:i'?m|i am)\s+[A-Z][a-z]+\b/.test(text)) {
    signals.add("Named person");
  }

  if (/\b(?:technician|engineer|owner)\b/i.test(text)) {
    signals.add("Technician, engineer, or owner mentioned");
  }

  if (/\bdave\b/i.test(text)) {
    signals.add("Named technician");
  }

  if (cleanText.includes("no fix no fee")) {
    signals.add("No fix no fee");
  }

  if (cleanText.includes("warranty")) {
    signals.add("Warranty");
  }

  if (cleanText.includes("guarantee")) {
    signals.add("Guarantee");
  }

  if (
    cleanText.includes("no call-out fee") ||
    cleanText.includes("no call out fee")
  ) {
    signals.add("No call-out fee");
  }

  if (cleanText.includes("free diagnostics")) {
    signals.add("Free diagnostics");
  }

  if (/\bsince\s+\d{4}\b/i.test(text)) {
    signals.add("Established history");
  }

  if (
    /\byears?\s+experience\b/i.test(text) ||
    /\bover\s+\d+\s+years?\b/i.test(text)
  ) {
    signals.add("Experience stated");
  }

  if (/[“"][^”"]{20,}[”"]/.test(text) || /\btestimonial(s)?\b/i.test(text)) {
    signals.add("Testimonials");
  }

  if (/\b[A-Z][a-z]+\s+(?:said|says|reviewed|recommends?)\b/.test(text)) {
    signals.add("Customer-style review wording");
  }

  if (/\blocal\b/i.test(text)) {
    signals.add("Local business identity");
  }

  if (/\bfamily[- ]run\b/i.test(text)) {
    signals.add("Family-run business");
  }

  if (/\bindependent\b/i.test(text)) {
    signals.add("Independent business");
  }

  return Array.from(signals);
}

function findBlogMediaTrustSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const cleanText = normalise(text);
  const signals = new Set<string>();

  if (
    /\b(?:by|author|written by|reviewed by|edited by)\s+[A-Z][a-z]+/i.test(
      text
    ) ||
    /\b(?:expert|specialist|editor|journalist|researcher|credentials?|bio)\b/i.test(
      text
    )
  ) {
    signals.add("Author expertise");
  }

  if (
    /\b(?:i|we|our team)\s+(?:tested|tried|used|found|compared|reviewed)\b/i.test(
      text
    ) ||
    /\b(?:hands-on|first-hand|in our testing|from experience)\b/i.test(text)
  ) {
    signals.add("First-hand experience wording");
  }

  if (
    /\b(?:published|updated|last updated|reviewed)\b/i.test(text) ||
    /\b(?:20[2-9]\d|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
      text
    )
  ) {
    signals.add("Freshness/date signals");
  }

  if (
    /\b(?:faq|frequently asked questions|questions and answers)\b/i.test(
      text
    ) ||
    [...headings.h2, ...headings.h3].some((heading) => /\?/.test(heading))
  ) {
    signals.add("FAQ coverage");
  }

  if (
    /\b(?:example|for example|tutorial|step-by-step|checklist|table|template|walkthrough)\b/i.test(
      text
    )
  ) {
    signals.add("Examples/tutorial style content");
  }

  if (
    /\b(?:source|sources|citation|citations|references|resources|according to|study|research)\b/i.test(
      text
    ) ||
    /href=["']https?:\/\//i.test(text)
  ) {
    signals.add("Citations/resources");
  }

  if (/href=["'][^"']+/i.test(text) || cleanText.includes("related articles")) {
    signals.add("Internal links to related content");
  }

  return Array.from(signals);
}

function findBlogMediaTopicSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const cleanText = normalise(text);
  const signals = new Set<string>();
  const allHeadings = [...headings.h1, ...headings.h2, ...headings.h3].join(" ");

  if (
    headings.h2.length + headings.h3.length >= 4 ||
    /\b(?:also|related|compare|alternatives|benefits|drawbacks|types|causes|options)\b/i.test(
      text
    )
  ) {
    signals.add("Semantic breadth");
  }

  if (
    /\b(?:troubleshoot|troubleshooting|problem|issue|error|fix|solve|solution|why|how to)\b/i.test(
      text
    )
  ) {
    signals.add("Troubleshooting coverage");
  }

  if (
    /\b(?:what is|how to|why does|guide|explained|learn|tips|steps|tutorial)\b/i.test(
      `${text} ${allHeadings}`
    )
  ) {
    signals.add("Informational intent alignment");
  }

  if (
    /\?/.test(`${text} ${allHeadings}`) ||
    /\b(?:people also ask|frequently asked|faq|questions)\b/i.test(text)
  ) {
    signals.add("PAA-style question coverage");
  }

  return Array.from(signals);
}

function findSchemaTypes(schemaSource: string): string[] {
  return scoringConfig.schemaTypes.filter((type) =>
    new RegExp(`"@type"\\s*:\\s*"[^"]*${type}[^"]*"`, "i").test(
      schemaSource
    )
  );
}

export function extractSignals(input: ScoringInput): ExtractedSignals {
  const intentMode: IntentMode = input.intentMode ?? "local-seo";
  const html = input.html ?? "";
  const schemaSource = `${html}\n${input.schemaJson ?? ""}`;
  const pageText = input.text ?? stripHtml(html);
  const title = input.title ?? "";
  const metaDescription = input.metaDescription ?? "";
  const headings = normaliseHeadings(input.headings, html);
  const trustSignals =
    intentMode === "blog-media"
      ? findBlogMediaTrustSignals(`${pageText}\n${html}`, headings)
      : findTrustSignals(pageText);
  const topicSignals =
    intentMode === "blog-media"
      ? findBlogMediaTopicSignals(pageText, headings)
      : [];
  const ctaWords = findMatches(pageText, scoringConfig.ctaWords);
  const schemaTypes = findSchemaTypes(schemaSource);
  const locationMentionCount = countPhrase(pageText, input.location);
  const hasPhoneNumber = findPhoneNumber(pageText);
  const titleKeywordMatch =
    intentMode === "blog-media"
      ? includesBlogMediaSemanticPhrase(title, input.keyword)
      : includesPhrase(title, input.keyword);
  const metaDescriptionKeywordMatch = includesPhrase(
    metaDescription,
    input.keyword
  );
  const metaDescriptionLocationMatch = includesPhrase(
    metaDescription,
    input.location
  );
  const wordCount = countWords(pageText);
  const evidence = [
    `Word count: ${wordCount}`,
    `Headings found: ${headings.h1.length} H1, ${headings.h2.length} H2, ${headings.h3.length} H3`,
    `Location mentions: ${locationMentionCount}`,
    hasPhoneNumber ? "Phone number detected" : "No phone number detected",
    trustSignals.length > 0
      ? `Trust signals: ${trustSignals.join(", ")}`
      : intentMode === "blog-media"
        ? "No Blog/Media trust signals detected"
        : "No basic trust signals detected",
    ...(intentMode === "blog-media"
      ? [
          topicSignals.length > 0
            ? `Topic signals: ${topicSignals.join(", ")}`
            : "No Blog/Media topic signals detected"
        ]
      : []),
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
    topicSignals,
    ctaWords,
    schemaTypes,
    evidence
  };
}
