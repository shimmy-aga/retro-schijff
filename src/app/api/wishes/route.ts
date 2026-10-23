import { NextResponse } from "next/server";
import { getWishes, addWish } from "@/lib/store";
export async function GET() { return NextResponse.json(getWishes()); }
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(addWish(body));
}