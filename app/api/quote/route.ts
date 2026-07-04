import { NextResponse } from "next/server";
import { getQuote } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secid = searchParams.get("secid") ?? "";
    const data = await getQuote(secid);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "报价获取失败" },
      { status: 500 }
    );
  }
}
