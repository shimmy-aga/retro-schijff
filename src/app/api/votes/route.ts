import { NextResponse } from "next/server";
import { getVotes, addVote } from "@/lib/store";
export async function GET() { return NextResponse.json(getVotes()); }
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(addVote(body));
}