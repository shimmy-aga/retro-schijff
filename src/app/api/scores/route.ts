import { NextResponse } from "next/server";
import { getScores, addScore } from "@/lib/store";
export async function GET() { return NextResponse.json(getScores()); }
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(addScore(body));
}