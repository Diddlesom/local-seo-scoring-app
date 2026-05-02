import type { FetchedPageData } from "./types";

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

function getTagContent(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function getMetaDescription(html: string): string {
  const match = html.match(
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
  ) ?? html.match(
    /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
  );

  return match ? cleanText(match[1]) : "";
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

  return headings;
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");
}

function getBodyHtml(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function extractPhoneNumbers(text: string): string[] {
  const matches = text.match(/(?:\+?\d[\s().-]?){10,}/g) ?? [];
  return Array.from(new Set(matches.map((match) => cleanText(match))));
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
  const addressWords = /\b(street|road|lane|avenue|drive|close|unit|suite|postcode|somerset|county|town|city)\b/i;
  const postcode = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

  return parts
    .filter((part) => addressWords.test(part) || postcode.test(part))
    .slice(0, 5);
}

export function extractPageData(url: string, html: string): FetchedPageData {
  const visibleHtml = removeHiddenContent(getBodyHtml(html));
  const bodyText = stripTags(visibleHtml);
  const schemaScripts = extractJsonLd(html);

  return {
    url,
    title: getTagContent(html, "title"),
    metaDescription: getMetaDescription(html),
    html: visibleHtml,
    bodyText,
    headings: {
      h1: extractHeadings(html, "h1"),
      h2: extractHeadings(html, "h2"),
      h3: extractHeadings(html, "h3")
    },
    schemaJson: schemaScripts.join("\n\n"),
    phoneNumbers: extractPhoneNumbers(bodyText),
    telLinks: extractTelLinks(html),
    addressLikeText: extractAddressLikeText(bodyText)
  };
}
