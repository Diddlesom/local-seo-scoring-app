import { NextResponse } from "next/server";
import { scoreLocalSeo } from "../../../lib/scoring/scoring-engine";
import type { ScoringInput } from "../../../lib/scoring/types";

export async function POST(request: Request) {
  const input = (await request.json()) as ScoringInput;
  const result = scoreLocalSeo(input);

  return NextResponse.json(result);
}
