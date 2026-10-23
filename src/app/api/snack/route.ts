import { NextResponse } from "next/server";
import { bumpSnack } from "@/lib/store";
export async function POST() { return NextResponse.json(bumpSnack()); }
export async function GET() {
  // read count via config
  const { getConfig } = await import("@/lib/store");
  return NextResponse.json({ count: getConfig().snackCount || 0 });
}