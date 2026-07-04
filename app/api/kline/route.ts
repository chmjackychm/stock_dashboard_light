import { NextResponse } from "next/server";
import { getKline } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secid = searchParams.get("secid") ?? "";
    const count = Number(searchParams.get("count") ?? 60);
    const data = await getKline(secid, Number.isFinite(count) ? count : 60);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "K 线获取失败" },
      { status: 500 }
    );
  }
}
