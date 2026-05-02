import type { FetchedPageData } from "./types";

const boilerplatePatterns = [
  /^skip to (main )?content$/i,
  /^privacy policy$/i,
  /^cookie policy$/i,
  /^terms (and|&) conditions$/i,
  /^all rights reserved$/i,
  /^accept cookies?$/i,
  /^manage cookies?$/i,
  /^close$/i,
  /^menu$/i,
  /^search$/i
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_entity, code) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_entity, code) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function cleanText(text: string): string {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function stripTags(html: string): string {
  return cleanText(html.replace(/<[^>]+>/g, " "));
}

function removeBlocks(html: string, tags: string[]): string {
  return tags.reduce(
    (currentHtml, tag) =>
      currentHtml.replace(
        new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"),
        " "
      ),
    html
  );
}

function getTagContent(html: string, tag: string): string {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  );
  return match ? stripTags(match[1]) : "";
}

function getMetaDescription(html: string): string {
  const match =
    html.match(
      /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
    ) ??
    html.match(
      /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
    );

  return match ? cleanText(match[1]) : "";
}

function extractBlocks(html: string, tag: "main" | "article" | "section"): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const blocks: string[] = [];
  let match = pattern.exec(html);

  while (match) {
    blocks.push(match[1]);
    match = pattern.exec(html);
  }

  return blocks;
}

function pickContentHtml(html: string): string {
  const bodyHtml = getBodyHtml(html);
  const cleanedBody = removePageChrome(bodyHtml);
  const preferredBlocks = [
    ...extractBlocks(cleanedBody, "main"),
    ...extractBlocks(cleanedBody, "article"),
    ...extractBlocks(cleanedBody, "section")
  ].filter((block) => stripTags(block).length > 80);

  if (preferredBlocks.length > 0) {
    return preferredBlocks.join("\n");
  }

  return cleanedBody;
}

function extractHeadings(html: string, tag: "h1" | "h2" | "h3"): string[] {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const headings: string[] = [];
  let match = pattern.exec(html);

  while (match) {
    const heading = stripTags(match[1]);

    if (heading) {
      headings.push(heading);
    }

    match = pattern.exec(html);
  }

  return Array.from(new Set(headings));
}

function extractJsonLd(html: string): string[] {
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scripts: string[] = [];
  let match = pattern.exec(html);

  while (match) {
    const schema = cleanText(match[1]);

    if (schema) {
      scripts.push(schema);
    }

    match = pattern.exec(html);
  }

  return scripts;
}

function removeHiddenContent(html: string): string {
  return removeBlocks(html, ["script", "style", "noscript", "svg", "form"]);
}

function removePageChrome(html: string): string {
  return removeBlocks(removeHiddenContent(html), ["header", "nav", "footer"]);
}

function getBodyHtml(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function htmlToLines(html: string): string[] {
  return html
    .replace(
      /<(h[1-6]|p|li|br|div|section|article|summary|button|dt)\b[^>]*>/gi,
      "\n"
    )
    .replace(
      /<\/(h[1-6]|p|li|div|section|article|summary|button|dt)>/gi,
      "\n"
    )
    .split("\n")
    .map(stripTags)
    .filter(Boolean);
}

function isBoilerplate(line: string): boolean {
  return boilerplatePatterns.some((pattern) => pattern.test(line));
}

function reduceNoise(lines: string[]): string[] {
  const counts = new Map<string, number>();

  lines.forEach((line) => {
    const key = line.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const seen = new Set<string>();

  return lines.filter((line) => {
    const key = line.toLowerCase();
    const wordCount = line.split(/\s+/).length;
    const isRepeatedShortLine = (counts.get(key) ?? 0) > 1 && wordCount <= 6;

    if (seen.has(key) || isRepeatedShortLine || isBoilerplate(line)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractCleanText(html: string): string {
  return reduceNoise(htmlToLines(html)).join("\n");
}

function extractPhoneNumbers(text: string): string[] {
  const matches = text.match(/(?:\+?\d[\s().-]?){10,}/g) ?? [];
  return Array.from(
    new Set(matches.map((match) => cleanText(match).replace(/[. -]+$/g, "")))
  );
}

function extractTelLinks(html: string): string[] {
  const matches = html.match(/href=["']tel:([^"']+)["']/gi) ?? [];
  const links = matches
    .map((match) => match.replace(/^href=["']tel:/i, "").replace(/["']$/g, ""))
    .map(cleanText)
    .filter(Boolean);

  return Array.from(new Set(links));
}

function extractAddressLikeText(text: string): string[] {
  const parts = text
    .split(/[.\n]/)
    .map(cleanText)
    .filter(Boolean);
  const addressWords =
    /\b(street|road|lane|avenue|drive|close|unit|suite|postcode|somerset|county|town|city)\b/i;
  const postcode = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

  return parts
    .filter((part) => addressWords.test(part) || postcode.test(part))
    .slice(0, 5);
}

function isFaqHeading(text: string): boolean {
  return /\b(frequently asked questions|faqs?|faq)\b/i.test(text);
}

function getHeadingLevel(tagName: string): number {
  return Number(tagName.replace(/h/i, ""));
}

function extractFaqSections(html: string): string[] {
  const headingPattern = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  const faqSections: string[] = [];
  let match = headingPattern.exec(html);

  while (match) {
    const headingTag = match[1];
    const headingText = stripTags(match[2]);

    if (isFaqHeading(headingText)) {
      const faqHeadingLevel = getHeadingLevel(headingTag);
      const sectionStart = match.index + match[0].length;
      const restOfHtml = html.slice(sectionStart);
      const nextHeadingPattern = /<(h[1-6])[^>]*>[\s\S]*?<\/\1>/gi;
      let nextHeading = nextHeadingPattern.exec(restOfHtml);
      let sectionEnd = html.length;

      while (nextHeading) {
        const nextHeadingLevel = getHeadingLevel(nextHeading[1]);

        if (nextHeadingLevel <= faqHeadingLevel) {
          sectionEnd = sectionStart + nextHeading.index;
          break;
        }

        nextHeading = nextHeadingPattern.exec(restOfHtml);
      }

      faqSections.push(html.slice(sectionStart, sectionEnd));
    }

    match = headingPattern.exec(html);
  }

  return faqSections;
}

function normalizeQuestion(question: string): string {
  return question.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanFaqQuestion(question: string): string {
  return cleanText(question.replace(/^(q|question)\s*[:.-]\s*/i, ""));
}

function cleanFaqAnswer(answer: string): string {
  return cleanText(answer.replace(/^(a|answer)\s*[:.-]\s*/i, ""));
}

function isQuestionLine(line: string): boolean {
  return line.endsWith("?") || /^(q|question)\s*[:.-]/i.test(line);
}

function isAnswerLine(line: string): boolean {
  return /^(a|answer)\s*[:.-]/i.test(line);
}

function getQuestionAnswerFromLines(lines: string[]): FetchedPageData["faqItems"] {
  const items: FetchedPageData["faqItems"] = [];

  lines.forEach((line, index) => {
    if (!isQuestionLine(line) || isFaqHeading(line)) {
      return;
    }

    const answer = lines
      .slice(index + 1)
      .find(
        (possibleAnswer) =>
          !isQuestionLine(possibleAnswer) || isAnswerLine(possibleAnswer)
      );

    items.push({
      question: cleanFaqQuestion(line),
      answer: answer ? cleanFaqAnswer(answer) : ""
    });
  });

  return items;
}

function getQuestionAnswerFromHtml(html: string): FetchedPageData["faqItems"] {
  const qaPattern =
    /<(h[2-6]|summary|dt|button)[^>]*>([\s\S]*?\?)[\s\S]*?<\/\1>\s*<(p|dd|div)[^>]*>([\s\S]*?)<\/\3>/gi;
  const items: FetchedPageData["faqItems"] = [];
  let match = qaPattern.exec(html);

  while (match) {
    const question = stripTags(match[2]);
    const answer = stripTags(match[4]);

    if (question.endsWith("?") && answer && !answer.endsWith("?")) {
      items.push({ question, answer });
    }

    match = qaPattern.exec(html);
  }

  return items;
}

function extractFaqItems(html: string): FetchedPageData["faqItems"] {
  const faqSections = extractFaqSections(html);
  const itemsByQuestion = new Map<string, { question: string; answer: string }>();

  faqSections
    .flatMap((sectionHtml) => [
      ...getQuestionAnswerFromHtml(sectionHtml),
      ...getQuestionAnswerFromLines(htmlToLines(sectionHtml))
    ])
    .forEach((item) => {
      const key = normalizeQuestion(item.question);
      const existingItem = itemsByQuestion.get(key);

      if (!existingItem || (!existingItem.answer && item.answer)) {
        itemsByQuestion.set(key, item);
      }
    });

  return Array.from(itemsByQuestion.values()).slice(0, 8);
}

function extractRelatedInternalLinks(
  pageUrl: string,
  html: string
): FetchedPageData["relatedInternalLinks"] {
  const baseUrl = new URL(pageUrl);
  const currentPageUrl = normalizeUrlForComparison(baseUrl);
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const relatedWords = [
    "computer repair",
    "computer-repair",
    "laptop repair",
    "laptop",
    "mac repair",
    "mac",
    "data recovery",
    "data-recovery",
    "virus removal",
    "virus",
    "repair",
    "service",
    "location"
  ];
  const links = new Map<string, { score: number; text: string; url: string }>();
  let match = linkPattern.exec(html);

  while (match) {
    try {
      const resolvedUrl = new URL(match[1], baseUrl);
      const text = stripTags(match[2]);
      const comparable = `${text} ${resolvedUrl.pathname}`.toLowerCase();
      const score = relatedWords.reduce(
        (total, word) => total + (comparable.includes(word) ? 1 : 0),
        0
      );

      if (
        resolvedUrl.hostname === baseUrl.hostname &&
        normalizeUrlForComparison(resolvedUrl) !== currentPageUrl &&
        score > 0 &&
        !looksLikeBlogUrl(resolvedUrl)
      ) {
        links.set(resolvedUrl.toString(), {
          score,
          text: text || resolvedUrl.pathname,
          url: resolvedUrl.toString()
        });
      }
    } catch {
      // Ignore invalid href values.
    }

    match = linkPattern.exec(html);
  }

  return Array.from(links.values())
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ text, url }) => ({ text, url }));
}

function normalizeUrlForComparison(url: URL): string {
  const pathname = url.pathname.replace(/\/+$/g, "") || "/";
  return `${url.origin}${pathname}`.toLowerCase();
}

function looksLikeBlogUrl(url: URL): boolean {
  return /\/(blog|news|article|articles|post|posts|category|tag)\//i.test(
    url.pathname
  );
}

export function extractPageData(url: string, html: string): FetchedPageData {
  const contentHtml = pickContentHtml(html);
  const cleanTextContent = extractCleanText(contentHtml);
  const schemaScripts = extractJsonLd(html);
  const faqItems = extractFaqItems(contentHtml);
  const headings = {
    h1: extractHeadings(contentHtml, "h1"),
    h2: extractHeadings(contentHtml, "h2"),
    h3: extractHeadings(contentHtml, "h3")
  };

  return {
    url,
    title: getTagContent(html, "title"),
    metaDescription: getMetaDescription(html),
    html: contentHtml,
    cleanText: cleanTextContent,
    bodyText: cleanTextContent,
    headings,
    schemaJson: schemaScripts.join("\n\n"),
    phoneNumbers: extractPhoneNumbers(cleanTextContent),
    telLinks: extractTelLinks(html),
    addressLikeText: extractAddressLikeText(cleanTextContent),
    faqQuestions: faqItems.map((item) => item.question),
    faqItems,
    relatedInternalLinks: extractRelatedInternalLinks(url, html)
  };
}
