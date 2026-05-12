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

const ctaWordsByIntentMode: Record<IntentMode, readonly string[]> = {
  "local-seo": [
    "call",
    "book",
    "quote",
    "schedule",
    "visit",
    "repair",
    "contact"
  ],
  "blog-media": [
    "read more",
    "learn more",
    "continue reading",
    "subscribe",
    "download guide",
    "related articles",
    "newsletter"
  ],
  affiliate: [
    "check price",
    "buy now",
    "view deal",
    "see on amazon",
    "best price",
    "compare",
    "shop now"
  ],
  saas: [
    "free trial",
    "get started",
    "request demo",
    "book demo",
    "start free",
    "sign up",
    "pricing"
  ]
};

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

function findAffiliateTrustSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const signals = new Set<string>();
  const allContent = `${text} ${headings.h1.join(" ")} ${headings.h2.join(" ")} ${headings.h3.join(" ")}`;

  if (hasVisibleAffiliateDisclosure(allContent)) {
    signals.add("Affiliate disclosure");
  }

  if (
    /\b(?:by|author|written by|reviewed by|edited by)\s+[A-Z][a-z]+/i.test(
      allContent
    ) ||
    /\b(?:reviewer|expert|specialist|editor|credentials?|bio|tested by)\b/i.test(
      allContent
    )
  ) {
    signals.add("Author/reviewer expertise");
  }

  if (
    /\b(?:i|we|our team)\s+(?:tested|tried|used|compared|reviewed|measured|benchmarked)\b/i.test(
      allContent
    ) ||
    /\b(?:hands-on|first-hand|in our testing|during testing|real-world testing|lab test|review unit)\b/i.test(
      allContent
    )
  ) {
    signals.add("First-hand testing/review wording");
  }

  if (
    /\b(?:published|updated|last updated|reviewed|checked)\b/i.test(
      allContent
    ) ||
    /\b(?:20[2-9]\d|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
      allContent
    )
  ) {
    signals.add("Freshness/date signals");
  }

  if (
    /\b(?:faq|frequently asked questions|questions and answers)\b/i.test(
      allContent
    ) ||
    [...headings.h2, ...headings.h3].some((heading) => /\?/.test(heading))
  ) {
    signals.add("FAQs");
  }

  if (/href=["'][^"']+/i.test(allContent)) {
    signals.add("Internal links to reviews/comparisons/guides");
  }

  return Array.from(signals);
}

function hasVisibleAffiliateDisclosure(text: string): boolean {
  return /\b(?:affiliate disclosure|affiliate links?|as an amazon associate|earns from qualifying purchases|commission at no extra cost|we may earn (?:a )?commission|sponsored links?|paid links?|reader-supported)\b/i.test(
    text
  );
}

function hasAmazonAssociateWording(text: string): boolean {
  return /\bas an amazon associate\b|\bearn(?:s)? from qualifying purchases\b/i.test(
    text
  );
}

function hasAffiliateLinks(html: string): boolean {
  return /<a\b[^>]+href=["'][^"']*(?:amazon\.[^/"']+|amzn\.to|tag=|aff(?:iliate)?|ref=|utm_(?:source|medium)=affiliate)[^"']*["']/i.test(
    html
  );
}

function productSchemaHasSnippetFields(schemaSource: string): boolean {
  return /"@type"\s*:\s*"[^"]*Product[^"]*"/i.test(schemaSource) &&
    /"(?:offers|review|aggregateRating)"\s*:/i.test(schemaSource);
}

function productSchemaHasName(schemaSource: string): boolean {
  return /"@type"\s*:\s*"[^"]*Product[^"]*"[\s\S]*?"name"\s*:\s*"[^"]+"/i.test(
    schemaSource
  );
}

function createAffiliateChecks({
  html,
  schemaSource,
  schemaTypes,
  text
}: {
  html: string;
  schemaSource: string;
  schemaTypes: string[];
  text: string;
}): NonNullable<ExtractedSignals["affiliateChecks"]> {
  const visibleText = `${stripHtml(html)} ${text}`;
  const productSchemaDetected = schemaTypes.includes("Product");
  const productSchemaEligibleForSnippets =
    productSchemaDetected &&
    productSchemaHasName(schemaSource) &&
    productSchemaHasSnippetFields(schemaSource);

  return {
    visibleAffiliateDisclosurePresent: hasVisibleAffiliateDisclosure(visibleText),
    affiliateLinksPresent: hasAffiliateLinks(html),
    productReviewComparisonSchemaPresent: schemaTypes.some((type) =>
      ["Product", "Review", "ItemList"].includes(type)
    ),
    amazonAssociateWordingPresent: hasAmazonAssociateWording(visibleText),
    productSchemaDetected,
    productSchemaEligibleForSnippets,
    productSchemaMayBeIneligible:
      productSchemaDetected && !productSchemaEligibleForSnippets,
    cleanComparisonSchemaPresent:
      schemaTypes.includes("ItemList") &&
      schemaTypes.includes("FAQPage") &&
      !productSchemaDetected
  };
}

function findAffiliateTopicSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const signals = new Set<string>();
  const allHeadings = [...headings.h1, ...headings.h2, ...headings.h3].join(" ");
  const allContent = `${text} ${allHeadings}`;

  if (
    /\b(?:product|products|model|models|brand|brands|device|devices|software|tool|tools|platform|platforms)\b/i.test(
      allContent
    ) ||
    /\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){1,3}\b/.test(allContent)
  ) {
    signals.add("Product names/entities");
  }

  if (
    /\b(?:category|categories|type|types|budget|premium|entry-level|mid-range|professional|consumer|business)\b/i.test(
      allContent
    )
  ) {
    signals.add("Product categories");
  }

  if (
    /<table[\s>]/i.test(text) ||
    /\b(?:comparison table|compare|compared|versus| vs\.? |side-by-side)\b/i.test(
      allContent
    )
  ) {
    signals.add("Comparison tables/criteria");
  }

  if (/\b(?:pros?|cons?|advantages?|disadvantages?|drawbacks?)\b/i.test(allContent)) {
    signals.add("Pros and cons");
  }

  if (/\b(?:best for|best overall|best budget|best value|best premium|best for beginners|best choice)\b/i.test(allContent)) {
    signals.add("Best-for sections");
  }

  if (/\b(?:buying guide|buyer guide|buyers guide|how to choose|what to look for|before you buy)\b/i.test(allContent)) {
    signals.add("Buyer guide sections");
  }

  if (/\b(?:price|pricing|cost|value|cheap|budget|deal|discount|save|worth it|money)\b/i.test(allContent)) {
    signals.add("Pricing/value language");
  }

  if (/\b(?:alternative|alternatives|competitor|comparison|compare|versus| vs\.? )\b/i.test(allContent)) {
    signals.add("Alternatives/comparisons");
  }

  return Array.from(signals);
}

function findSaasTrustSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const signals = new Set<string>();
  const allContent = `${text} ${headings.h1.join(" ")} ${headings.h2.join(" ")} ${headings.h3.join(" ")}`;

  if (
    /\b(?:testimonial|case stud(?:y|ies)|customer story|customer stories|trusted by|customers include)\b/i.test(
      allContent
    )
  ) {
    signals.add("Testimonials/case studies");
  }

  if (
    /\b(?:security|secure|soc\s?2|iso\s?27001|gdpr|hipaa|compliance|sso|encryption|permissions|data protection)\b/i.test(
      allContent
    )
  ) {
    signals.add("Security/compliance trust signals");
  }

  if (
    /\b(?:docs|documentation|help center|help centre|support|knowledge base|developer docs|api docs)\b/i.test(
      allContent
    )
  ) {
    signals.add("Support/help documentation links");
  }

  if (
    /\b(?:faq|frequently asked questions|questions and answers)\b/i.test(
      allContent
    ) ||
    [...headings.h2, ...headings.h3].some((heading) => /\?/.test(heading))
  ) {
    signals.add("FAQs");
  }

  if (
    /\b(?:by|author|written by|reviewed by|edited by)\s+[A-Z][a-z]+/i.test(
      allContent
    ) ||
    /\b(?:company|team|founder|expert|specialist|product team|editorial team)\b/i.test(
      allContent
    )
  ) {
    signals.add("Author/company expertise");
  }

  if (
    /\b(?:published|updated|last updated|reviewed|checked)\b/i.test(
      allContent
    ) ||
    /\b(?:20[2-9]\d|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
      allContent
    )
  ) {
    signals.add("Freshness/date signals");
  }

  return Array.from(signals);
}

function findSaasTopicSignals(
  text: string,
  headings: ExtractedSignals["headings"]
): string[] {
  const signals = new Set<string>();
  const allHeadings = [...headings.h1, ...headings.h2, ...headings.h3].join(" ");
  const allContent = `${text} ${allHeadings}`;

  if (
    /\b(?:software|platform|app|application|tool|suite|dashboard|workspace|crm|automation|analytics|product)\b/i.test(
      allContent
    ) ||
    /\b[A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){1,3}\b/.test(allContent)
  ) {
    signals.add("Product name/entities");
  }

  if (/\b(?:crm|cms|erp|project management|analytics|automation|helpdesk|email marketing|seo|accounting|hr|sales|support|category)\b/i.test(allContent)) {
    signals.add("Product category");
  }

  if (/\b(?:feature|features|capability|capabilities|workflow|automation|dashboard|reporting|collaboration|api)\b/i.test(allContent)) {
    signals.add("Features");
  }

  if (/\b(?:benefit|benefits|save time|reduce|increase|improve|faster|easier|roi|productivity|efficiency)\b/i.test(allContent)) {
    signals.add("Benefits");
  }

  if (/\b(?:use case|use cases|for teams|for agencies|for startups|for enterprise|persona|personas|industry|industries)\b/i.test(allContent)) {
    signals.add("Use cases/personas");
  }

  if (/\b(?:integration|integrations|connects with|works with|zapier|slack|salesforce|hubspot|google|microsoft)\b/i.test(allContent)) {
    signals.add("Integrations");
  }

  if (/\b(?:pricing|price|free trial|trial|demo|book a demo|sign up|signup|contact sales|plan|plans)\b/i.test(allContent)) {
    signals.add("Pricing/free trial/demo language");
  }

  if (/\b(?:alternative|alternatives|comparison|compare|versus| vs\.? |competitor|competitors)\b/i.test(allContent)) {
    signals.add("Comparison/alternatives content");
  }

  if (/\b(?:onboarding|setup|implementation|getting started|migration|install|configuration)\b/i.test(allContent)) {
    signals.add("Onboarding/setup content");
  }

  if (/<img\b|<video\b|\b(?:screenshot|screenshots|product tour|demo video|walkthrough|interface|ui)\b/i.test(allContent)) {
    signals.add("Screenshots/product visuals");
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

function appearsJsRendered(html: string, wordCount: number): boolean {
  if (wordCount >= 900) {
    return false;
  }

  const scriptCount = html.match(/<script\b/gi)?.length ?? 0;
  const appShellSignals =
    /__NEXT_DATA__|data-reactroot|id=["'](?:root|__next|app)["']|<noscript\b/i.test(
      html
  );
  const bodyText = stripHtml(html);
  const sparseContent = wordCount < 900;

  return sparseContent || scriptCount >= 5 || (appShellSignals && countWords(bodyText) < 250);
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
      : intentMode === "affiliate"
        ? findAffiliateTrustSignals(`${pageText}\n${html}`, headings)
        : intentMode === "saas"
          ? findSaasTrustSignals(`${pageText}\n${html}`, headings)
        : findTrustSignals(pageText);
  const topicSignals =
    intentMode === "blog-media"
      ? findBlogMediaTopicSignals(pageText, headings)
      : intentMode === "affiliate"
        ? findAffiliateTopicSignals(`${pageText}\n${html}`, headings)
        : intentMode === "saas"
          ? findSaasTopicSignals(`${pageText}\n${html}`, headings)
        : [];
  const ctaWords = findMatches(pageText, ctaWordsByIntentMode[intentMode]);
  const schemaTypes = findSchemaTypes(schemaSource);
  const affiliateChecks =
    intentMode === "affiliate"
      ? createAffiliateChecks({
          html,
          schemaSource,
          schemaTypes,
          text: `${pageText}\n${html}`
        })
      : undefined;
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
  const jsRenderingWarning =
    intentMode === "saas" && appearsJsRendered(html, wordCount);
  const evidence = [
    `Word count: ${wordCount}`,
    `Headings found: ${headings.h1.length} H1, ${headings.h2.length} H2, ${headings.h3.length} H3`,
    `Location mentions: ${locationMentionCount}`,
    hasPhoneNumber ? "Phone number detected" : "No phone number detected",
    trustSignals.length > 0
      ? `Trust signals: ${trustSignals.join(", ")}`
      : intentMode === "blog-media"
        ? "No Blog/Media trust signals detected"
        : intentMode === "affiliate"
          ? "No Affiliate trust signals detected"
          : intentMode === "saas"
            ? "No SaaS trust signals detected"
          : "No basic trust signals detected",
    ...(intentMode === "blog-media" || intentMode === "affiliate" || intentMode === "saas"
      ? [
          topicSignals.length > 0
            ? `Topic signals: ${topicSignals.join(", ")}`
            : intentMode === "affiliate"
              ? "No Affiliate buyer-intent topic signals detected"
              : intentMode === "saas"
                ? "No SaaS product/use-case topic signals detected"
                : "No Blog/Media topic signals detected"
        ]
      : []),
    ...(affiliateChecks
      ? [
          `Visible affiliate disclosure present: ${affiliateChecks.visibleAffiliateDisclosurePresent ? "true" : "false"}`,
          `Affiliate links present: ${affiliateChecks.affiliateLinksPresent ? "true" : "false"}`,
          `Product/review/comparison schema present: ${affiliateChecks.productReviewComparisonSchemaPresent ? "true" : "false"}`,
          `Amazon Associate wording present: ${affiliateChecks.amazonAssociateWordingPresent ? "true" : "false"}`,
          `Clean comparison schema present: ${affiliateChecks.cleanComparisonSchemaPresent ? "true" : "false"}`,
          ...(affiliateChecks.productSchemaMayBeIneligible
            ? [
                "Product schema detected, but it may not be eligible for Google Product snippets unless valid offers, review, or aggregateRating data is present. Do not add fake values."
              ]
            : [])
        ]
      : []),
    ctaWords.length > 0
      ? `CTA words: ${ctaWords.join(", ")}`
      : "No CTA words detected",
    schemaTypes.length > 0
      ? `Schema types: ${schemaTypes.join(", ")}`
      : "No target schema types detected",
    ...(intentMode !== "local-seo" &&
    schemaTypes.includes("LocalBusiness") &&
    schemaTypes.filter((type) =>
      getPreferredSchemaTypes(intentMode).includes(type)
    ).length === 0
      ? [
          "Detected schema appears primarily local-business focused rather than intent-specific."
        ]
      : []),
    ...(jsRenderingWarning
      ? [
          "Content may be incomplete due to JavaScript rendering limitations. Scores may be understated."
        ]
      : [])
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
    evidence,
    jsRenderingWarning,
    affiliateChecks
  };
}

function getPreferredSchemaTypes(intentMode: IntentMode): string[] {
  if (intentMode === "blog-media") {
    return [
      "Article",
      "BlogPosting",
      "FAQPage",
      "HowTo",
      "BreadcrumbList",
      "Organization"
    ];
  }

  if (intentMode === "affiliate") {
    return ["Product", "Review", "ItemList", "FAQPage", "Article", "BreadcrumbList"];
  }

  if (intentMode === "saas") {
    return [
      "SoftwareApplication",
      "Product",
      "Organization",
      "FAQPage",
      "BreadcrumbList"
    ];
  }

  return [
    "LocalBusiness",
    "Service",
    "Review",
    "Organization",
    "BreadcrumbList",
    "FAQPage"
  ];
}
