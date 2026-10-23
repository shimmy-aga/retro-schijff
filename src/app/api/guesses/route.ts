import { NextResponse } from "next/server";
import { getGuesses, addGuess } from "@/lib/store";
export async function GET() { return NextResponse.json(getGuesses()); }
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(addGuess(body));
}