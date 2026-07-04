export type Market = "sh" | "sz";

export type SearchResult = {
  secid: string;
  code: string;
  name: string;
  type: string;
  market: Market;
};

export type Quote = {
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  time: string;
  change: number;
  pct: number;
  high: number;
  low: number;
};

export type KlineRow = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  MA5: number;
  MA10: number;
  MA20: number;
  K: number;
  D: number;
  J: number;
};

export type DetailResponse = {
  quote: Quote;
  kline: KlineRow[];
  recent: KlineRow[];
  latest: KlineRow;
};

export type WatchItem = {
  secid: string;
  code: string;
  name: string;
};
