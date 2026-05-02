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
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
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
    .replace(/<(h[1-6]|p|li|br|div|section|article)\b[^>]*>/gi, "\n")
    .replace(/<\/(h[1-6]|p|li|div|section|article)>/gi, "\n")
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

export function extractPageData(url: string, html: string): FetchedPageData {
  const contentHtml = pickContentHtml(html);
  const cleanTextContent = extractCleanText(contentHtml);
  const schemaScripts = extractJsonLd(html);

  return {
    url,
    title: getTagContent(html, "title"),
    metaDescription: getMetaDescription(html),
    html: contentHtml,
    cleanText: cleanTextContent,
    bodyText: cleanTextContent,
    headings: {
      h1: extractHeadings(contentHtml, "h1"),
      h2: extractHeadings(contentHtml, "h2"),
      h3: extractHeadings(contentHtml, "h3")
    },
    schemaJson: schemaScripts.join("\n\n"),
    phoneNumbers: extractPhoneNumbers(cleanTextContent),
    telLinks: extractTelLinks(html),
    addressLikeText: extractAddressLikeText(cleanTextContent)
  };
}
