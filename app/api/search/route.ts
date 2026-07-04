import { NextResponse } from "next/server";
import { searchSymbol } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const data = await searchSymbol(q);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "搜索失败" },
      { status: 500 }
    );
  }
}
