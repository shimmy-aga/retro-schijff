import { NextResponse } from "next/server";
import { bumpCraving } from "@/lib/store";
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(bumpCraving(id));
}