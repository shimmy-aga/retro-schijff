import { NextResponse } from "next/server";
import { resolveBets } from "@/lib/store";
export async function POST() { return NextResponse.json(resolveBets()); }