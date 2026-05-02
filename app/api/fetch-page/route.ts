import { NextResponse } from "next/server";
import { extractPageData } from "../../../lib/fetch-page/extract-page";

const blockedStatusCodes = new Set([401, 403, 429]);

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
          "Mozilla/5.0 (compatible; LocalSEOScoringApp/1.0; +https://example.com)",
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (blockedStatusCodes.has(response.status)) {
      return NextResponse.json(
        { error: "The page blocked the fetch request." },
        { status: 403 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "The page could not be fetched." },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType && !contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "The URL did not return an HTML page." },
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
