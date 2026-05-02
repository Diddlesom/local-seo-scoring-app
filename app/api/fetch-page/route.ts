import { NextResponse } from "next/server";
import { extractPageData } from "../../../lib/fetch-page/extract-page";

const blockedStatusCodes = new Set([401, 403, 429]);

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
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache"
      },
      redirect: "follow"
    });
    const contentType = response.headers.get("content-type") ?? "";

    if (blockedStatusCodes.has(response.status)) {
      return NextResponse.json(
        {
          error: `The page blocked the fetch request. ${createFetchError(
            response,
            contentType
          )}`
        },
        { status: 403 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: createFetchError(response, contentType) },
        { status: 502 }
      );
    }

    if (contentType && !contentType.includes("text/html")) {
      return NextResponse.json(
        {
          error: `The URL did not return an HTML page. ${createFetchError(
            response,
            contentType
          )}`
        },
        { status: 415 }
      );
    }

    const html = await response.text();
    const page = extractPageData(url.toString(), html);

    if (!page.bodyText) {
      return NextResponse.json(
        { error: "No visible page content could be extracted." },
        { status: 422 }
      );
    }

    return NextResponse.json(page);
  } catch {
    return NextResponse.json(
      { error: "The page could not be fetched." },
      { status: 502 }
    );
  }
}
