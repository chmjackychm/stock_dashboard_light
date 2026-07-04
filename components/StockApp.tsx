"use client";

import { Search, Trash2, Plus, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomNav, DetailPage, Metric, SettingsPage } from "@/components/AppPieces";
import { colorByChange, formatPrice, formatSigned } from "@/lib/format";
import type { DetailResponse, SearchResult, WatchItem } from "@/lib/types";

const STORAGE_KEY = "light-stock-watchlist-v1";
const DEFAULT_WATCHLIST: WatchItem[] = [
  { secid: "sh513310", name: "中韩半导体ETF华泰柏瑞", code: "513310" },
  { secid: "sz000021", name: "深科技", code: "000021" },
  { secid: "sz159558", name: "半导体设备ETF易方达", code: "159558" }
];

type Tab = "watch" | "search" | "settings";
type DetailSource = "watch" | "search";
type Summary = WatchItem & {
  detail?: DetailResponse;
  error?: string;
};

function isWatchItem(value: unknown): value is WatchItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as WatchItem;
  return /^(sh|sz)\d{6}$/.test(item.secid) && typeof item.code === "string" && typeof item.name === "string";
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }
  return payload.data as T;
}

export default function StockApp() {
  const [tab, setTab] = useState<Tab>("watch");
  const [detailSecid, setDetailSecid] = useState<string | null>(null);
  const [detailSource, setDetailSource] = useState<DetailSource>("watch");
  const [watchlist, setWatchlist] = useState<WatchItem[]>(DEFAULT_WATCHLIST);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const next = parsed.filter(isWatchItem);
          setWatchlist(next.length ? next : DEFAULT_WATCHLIST);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (storageReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    }
  }, [storageReady, watchlist]);

  const known = useMemo(() => new Set(watchlist.map((item) => item.secid)), [watchlist]);

  const addWatch = useCallback((item: WatchItem) => {
    setWatchlist((current) => {
      if (current.some((knownItem) => knownItem.secid === item.secid)) {
        return current;
      }
      return [item, ...current];
    });
    setMessage(`已加入自选：${item.name}`);
  }, []);

  const openDetail = useCallback((secid: string, source: DetailSource) => {
    setDetailSource(source);
    setDetailSecid(secid);
    setDetail(null);
    setMessage("");
  }, []);

  const loadDetail = useCallback(async (secid: string) => {
    setLoading(true);
    try {
      setDetail(await readJson<DetailResponse>(`/api/detail?secid=${encodeURIComponent(secid)}`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "详情加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailSecid) {
      void loadDetail(detailSecid);
    }
  }, [detailSecid, loadDetail]);

  useEffect(() => {
    if (!watchlist.length) {
      setSummaries([]);
      return;
    }
    let cancelled = false;
    void Promise.all(
      watchlist.map(async (item) => {
        try {
          const itemDetail = await readJson<DetailResponse>(`/api/detail?secid=${encodeURIComponent(item.secid)}`);
          return { ...item, name: itemDetail.quote.name, code: itemDetail.quote.code, detail: itemDetail };
        } catch (error) {
          return { ...item, error: error instanceof Error ? error.message : "加载失败" };
        }
      })
    ).then((items) => {
      if (!cancelled) {
        setSummaries(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [watchlist]);

  useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        setSearchResults(await readJson<SearchResult[]>(`/api/search?q=${encodeURIComponent(keyword)}`));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "搜索失败");
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const closeDetail = () => {
    setTab(detailSource);
    setDetailSecid(null);
    setDetail(null);
  };

  return (
    <main className="phoneShell">
      <div className="content">
        {detailSecid ? (
          <DetailPage
            detail={detail}
            loading={loading}
            isWatched={known.has(detailSecid)}
            returnLabel={detailSource === "search" ? "返回搜索" : "返回自选"}
            onBack={closeDetail}
            onRefresh={() => void loadDetail(detailSecid)}
            onAdd={() => detail && addWatch({ secid: detailSecid, name: detail.quote.name, code: detail.quote.code })}
          />
        ) : tab === "watch" ? (
          <WatchPage
            summaries={summaries}
            onSearch={() => setTab("search")}
            onOpen={(secid) => openDetail(secid, "watch")}
            onRemove={(secid) => setWatchlist((current) => current.filter((item) => item.secid !== secid))}
          />
        ) : tab === "search" ? (
          <SearchPage
            query={searchText}
            results={searchResults}
            known={known}
            onQuery={setSearchText}
            onOpen={(secid) => openDetail(secid, "search")}
            onAdd={(item) => addWatch(item)}
          />
        ) : (
          <SettingsPage />
        )}
        {message ? <p className="toast">{message}</p> : null}
      </div>
      <BottomNav active={tab} onChange={(next) => { setDetailSecid(null); setTab(next); }} />
    </main>
  );
}

function WatchPage({
  summaries,
  onSearch,
  onOpen,
  onRemove
}: {
  summaries: Summary[];
  onSearch: () => void;
  onOpen: (secid: string) => void;
  onRemove: (secid: string) => void;
}) {
  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>自选</h1>
          <p>实时行情与关键技术指标</p>
        </div>
        <button className="iconButton" onClick={onSearch} aria-label="搜索添加">
          <Plus size={20} />
        </button>
      </header>
      <div className="cardList">
        {summaries.map((item) => (
          <WatchCard key={item.secid} item={item} onOpen={() => onOpen(item.secid)} onRemove={() => onRemove(item.secid)} />
        ))}
      </div>
    </section>
  );
}

function WatchCard({ item, onOpen, onRemove }: { item: Summary; onOpen: () => void; onRemove: () => void }) {
  const detail = item.detail;
  const quote = detail?.quote;
  const latest = detail?.latest;
  const color = colorByChange(quote?.pct ?? 0);

  return (
    <article className="stockCard">
      <div className="stockTop">
        <div>
          <h2>{quote?.name ?? item.name}</h2>
          <p>{quote?.code ?? item.code}</p>
        </div>
        <div className="rightQuote">
          <strong>{quote ? formatPrice(quote.price) : "--"}</strong>
          <span style={{ background: color }}>{quote ? `${formatSigned(quote.pct)}%` : "--"}</span>
        </div>
      </div>
      <div className="metaGrid">
        <Metric label="涨跌额" value={quote ? formatSigned(quote.change, 3) : "--"} color={color} />
        <Metric label="涨跌幅" value={quote ? `${formatSigned(quote.pct)}%` : "--"} color={color} />
        <Metric label="MA5" value={latest ? latest.MA5.toFixed(3) : "--"} />
        <Metric label="MA10" value={latest ? latest.MA10.toFixed(3) : "--"} />
        <Metric label="J" value={latest ? latest.J.toFixed(2) : "--"} color="var(--magenta)" />
      </div>
      {item.error ? <p className="errorText">{item.error}</p> : null}
      <div className="actionRow">
        <button onClick={onOpen}><Eye size={16} />查看详情</button>
        <button onClick={onRemove} className="mutedButton"><Trash2 size={16} />删除自选</button>
      </div>
    </article>
  );
}

function SearchPage({
  query,
  results,
  known,
  onQuery,
  onOpen,
  onAdd
}: {
  query: string;
  results: SearchResult[];
  known: Set<string>;
  onQuery: (value: string) => void;
  onOpen: (secid: string) => void;
  onAdd: (item: WatchItem) => void;
}) {
  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>搜索</h1>
          <p>输入名称、拼音或 6 位代码</p>
        </div>
      </header>
      <label className="searchBox">
        <Search size={18} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="如 深科技 / 000021 / 513310" />
      </label>
      <div className="resultList">
        {results.map((item) => (
          <article className="searchResult" key={item.secid}>
            <div>
              <h2>{item.name}</h2>
              <p>{item.code} · {item.type}</p>
            </div>
            <div className="resultActions">
              <button onClick={() => onOpen(item.secid)}>查看</button>
              <button disabled={known.has(item.secid)} onClick={() => onAdd(item)}>
                {known.has(item.secid) ? "已加入" : "加入自选"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
