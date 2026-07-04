import { NextResponse } from "next/server";
import { getDetail } from "@/lib/market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secid = searchParams.get("secid") ?? "";
    const data = await getDetail(secid);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "详情获取失败" },
      { status: 500 }
    );
  }
}
