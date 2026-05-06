import { NextResponse } from "next/server";
import { extractPageData } from "../../../lib/fetch-page/extract-page";

const blockedStatusCodes = new Set([401, 403, 429]);
const browserHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache"
};

type FetchAttempt =
  | {
      html: string;
      reason?: string;
      source: "direct" | "jina";
      status: "success" | "limited";
    }
  | {
      contentType: string;
      reason: string;
      response?: Response;
      status: "failed";
    };

function createFetchError(response: Response, contentType: string): string {
  const isHtml = contentType.toLowerCase().includes("text/html");
  const statusText = response.statusText || "No status text";

  return `The page could not be fetched. HTTP ${response.status} ${statusText}. HTML response: ${isHtml ? "yes" : "no"}.`;
}

function parseUrl(value: unknown): URL | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function createJinaReaderUrl(url: URL): string {
  return `https://r.jina.ai/http://${url.toString().replace(/^https?:\/\//i, "")}`;
}

function hasVeryLittleReadableContent(html: string): boolean {
  const readableText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return readableText.length < 250;
}

async function fetchDirect(url: URL): Promise<FetchAttempt> {
  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: browserHeaders,
      redirect: "follow"
    });
  } catch {
    return {
      contentType: "",
      reason: "network error",
      status: "failed"
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (blockedStatusCodes.has(response.status) || response.status >= 500) {
    return {
      contentType,
      reason: `HTTP ${response.status}`,
      response,
      status: "failed"
    };
  }

  if (!response.ok) {
    return {
      contentType,
      reason: `HTTP ${response.status}`,
      response,
      status: "failed"
    };
  }

  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    return {
      contentType,
      reason: "non-HTML response",
      response,
      status: "failed"
    };
  }

  const html = await response.text();

  if (hasVeryLittleReadableContent(html)) {
    return {
      contentType,
      reason: "empty content",
      response,
      status: "failed"
    };
  }

  return {
    html,
    source: "direct",
    status: "success"
  };
}

async function fetchWithJinaReader(
  url: URL,
  directReason: string
): Promise<FetchAttempt> {
  let response: Response;

  try {
    response = await fetch(createJinaReaderUrl(url), {
      headers: browserHeaders,
      redirect: "follow"
    });
  } catch {
    return {
      contentType: "",
      reason: `${directReason}; Jina Reader network error`,
      status: "failed"
    };
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    return {
      contentType,
      reason: `${directReason}; Jina Reader HTTP ${response.status}`,
      response,
      status: "failed"
    };
  }

  const html = await response.text();

  if (hasVeryLittleReadableContent(html)) {
    return {
      contentType,
      reason: `${directReason}; Jina Reader returned empty content`,
      response,
      status: "failed"
    };
  }

  return {
    html,
    reason: `Direct fetch failed (${directReason}); used Jina Reader fallback.`,
    source: "jina",
    status: "limited"
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  const url = parseUrl(body.url);

  if (!url) {
    return NextResponse.json(
      { error: "Please enter a valid http or https URL." },
      { status: 400 }
    );
  }

  try {
    const directAttempt = await fetchDirect(url);
    const fetchAttempt =
      directAttempt.status === "failed"
        ? await fetchWithJinaReader(url, directAttempt.reason)
        : directAttempt;

    if (fetchAttempt.status === "failed") {
      if (
        directAttempt.status === "failed" &&
        directAttempt.response &&
        blockedStatusCodes.has(directAttempt.response.status)
      ) {
        return NextResponse.json(
          {
            error: `The page blocked the fetch request. ${createFetchError(
              directAttempt.response,
              directAttempt.contentType
            )}`
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: fetchAttempt.response
            ? createFetchError(fetchAttempt.response, fetchAttempt.contentType)
            : `The page could not be fetched. ${fetchAttempt.reason}.`
        },
        { status: 502 }
      );
    }

    const page = extractPageData(url.toString(), fetchAttempt.html);

    if (!page.bodyText) {
      return NextResponse.json(
        { error: "No visible page content could be extracted." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ...page,
      fetchStatus: fetchAttempt.status,
      fetchReason: fetchAttempt.reason,
      fetchSource: fetchAttempt.source
    });
  } catch {
    return NextResponse.json(
      { error: "The page could not be fetched." },
      { status: 502 }
    );
  }
}
