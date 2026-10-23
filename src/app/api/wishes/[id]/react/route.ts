import { NextResponse } from "next/server";
import { reactWish } from "@/lib/store";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json(reactWish(id, body.emoji));
}