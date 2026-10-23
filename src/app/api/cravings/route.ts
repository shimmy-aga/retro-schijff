import { NextResponse } from "next/server";
import { getCravings, addCraving } from "@/lib/store";
export async function GET() { return NextResponse.json(getCravings()); }
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(addCraving(body));
}