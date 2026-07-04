import type { DetailResponse, KlineRow, Quote, SearchResult } from "@/lib/types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Referer: "https://finance.qq.com"
};

const TYPE_MAP: Record<string, string> = {
  "GP-A": "A股",
  ETF: "ETF",
  "QDII-ETF": "QDII-ETF",
  ZS: "指数",
  KJ: "开基",
  LOF: "LOF",
  FJ: "分级基金"
};

function assertSecid(secid: string): void {
  if (!/^(sh|sz)\d{6}$/.test(secid)) {
    throw new Error("secid 格式不正确");
  }
}

function toNumber(value: string | number | undefined, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function decodeUnicodeEscapes(value: string): string {
  return value.replace(/\\u([\da-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

async function fetchText(url: string, encoding: string = "utf-8"): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`行情接口失败: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new TextDecoder(encoding).decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function movingAverage(rows: KlineRow[], index: number, windowSize: number): number {
  const start = Math.max(0, index - windowSize + 1);
  const slice = rows.slice(start, index + 1);
  const total = slice.reduce((sum, row) => sum + row.close, 0);
  return total / slice.length;
}

function withIndicators(rows: KlineRow[]): KlineRow[] {
  let prevK = 50;
  let prevD = 50;

  return rows.map((row, index) => {
    const lowWindow = rows.slice(Math.max(0, index - 8), index + 1);
    const lowest = Math.min(...lowWindow.map((item) => item.low));
    const highest = Math.max(...lowWindow.map((item) => item.high));
    const rsv = highest === lowest ? 0 : ((row.close - lowest) / (highest - lowest)) * 100;
    prevK = (2 / 3) * prevK + (1 / 3) * rsv;
    prevD = (2 / 3) * prevD + (1 / 3) * prevK;

    return {
      ...row,
      MA5: movingAverage(rows, index, 5),
      MA10: movingAverage(rows, index, 10),
      MA20: movingAverage(rows, index, 20),
      K: prevK,
      D: prevD,
      J: 3 * prevK - 2 * prevD
    };
  });
}

export async function searchSymbol(keyword: string, limit = 10): Promise<SearchResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const url = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(trimmed)}&t=all`;
  const raw = await fetchText(url, "gb18030");
  const match = raw.match(/v_hint="([^"]*)"/);
  if (!match || !match[1] || match[1] === "N") {
    return [];
  }

  const results: SearchResult[] = [];
  for (const item of match[1].split("^")) {
    const parts = item.split("~");
    if (parts.length < 5) {
      continue;
    }
    const [market, code, name, , secType] = parts;
    if (market !== "sh" && market !== "sz") {
      continue;
    }
    results.push({
      secid: `${market}${code}`,
      code,
        name: decodeUnicodeEscapes(name),
      type: TYPE_MAP[secType] ?? secType,
      market
    });
    if (results.length >= limit) {
      break;
    }
  }
  return results;
}

export async function getQuote(secid: string): Promise<Quote> {
  assertSecid(secid);
  const raw = await fetchText(`https://qt.gtimg.cn/q=${secid}`, "gb18030");
  const payload = raw.split('="')[1]?.split('"')[0];
  if (!payload) {
    throw new Error("未获取到实时行情数据");
  }
  const f = payload.split("~");
  if (f.length < 40) {
    throw new Error("实时行情字段不完整");
  }
  const ts = f[30] && f[30].length === 14
    ? `${f[30].slice(0, 4)}-${f[30].slice(4, 6)}-${f[30].slice(6, 8)} ${f[30].slice(8, 10)}:${f[30].slice(10, 12)}:${f[30].slice(12, 14)}`
    : f[30] ?? "";

  return {
    name: f[1] ?? "",
    code: f[2] ?? "",
    price: toNumber(f[3]),
    prevClose: toNumber(f[4]),
    open: toNumber(f[5]),
    volume: toNumber(f[6]),
    time: ts,
    change: toNumber(f[31]),
    pct: toNumber(f[32]),
    high: toNumber(f[33]),
    low: toNumber(f[34])
  };
}

export async function getKline(secid: string, count = 60): Promise<KlineRow[]> {
  assertSecid(secid);
  const safeCount = Math.min(Math.max(count, 30), 180);
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${secid},day,,,${safeCount},qfq`;
  const json = JSON.parse(await fetchText(url));
  const node = json?.data?.[secid] ?? {};
  const sourceRows: string[][] = node.qfqday ?? node.day ?? [];
  if (!sourceRows.length) {
    throw new Error("未获取到历史 K 线数据");
  }

  const rows = sourceRows.map((row) => ({
    date: row[0],
    open: toNumber(row[1]),
    close: toNumber(row[2]),
    high: toNumber(row[3]),
    low: toNumber(row[4]),
    volume: toNumber(row[5]),
    MA5: 0,
    MA10: 0,
    MA20: 0,
    K: 0,
    D: 0,
    J: 0
  }));

  return withIndicators(rows);
}

export async function getDetail(secid: string): Promise<DetailResponse> {
  const [quote, kline] = await Promise.all([getQuote(secid), getKline(secid, 60)]);
  const latest = kline[kline.length - 1];
  if (!latest) {
    throw new Error("历史数据为空");
  }
  return {
    quote,
    kline,
    recent: kline.slice(-7),
    latest
  };
}
