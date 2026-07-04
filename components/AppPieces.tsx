"use client";

import { ChevronLeft, RotateCw, Search, Settings, Star } from "lucide-react";
import { CandleVolumeChart, KdjChart } from "@/components/MiniCharts";
import { colorByChange, formatPrice, formatSigned, formatVolume, priceGap } from "@/lib/format";
import type { DetailResponse } from "@/lib/types";

type Tab = "watch" | "search" | "settings";

export function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="metricPill">
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
    </div>
  );
}

export function DetailPage({
  detail,
  loading,
  isWatched,
  returnLabel,
  onBack,
  onRefresh,
  onAdd
}: {
  detail: DetailResponse | null;
  loading: boolean;
  isWatched: boolean;
  returnLabel: string;
  onBack: () => void;
  onRefresh: () => void;
  onAdd: () => void;
}) {
  const quote = detail?.quote;
  const latest = detail?.latest;
  const color = colorByChange(quote?.pct ?? 0);
  const ma5Gap = quote && latest ? priceGap(quote.price, latest.MA5) : { abs: 0, pct: 0 };
  const ma10Gap = quote && latest ? priceGap(quote.price, latest.MA10) : { abs: 0, pct: 0 };

  return (
    <section>
      <div className="detailBar">
        <button onClick={onBack}><ChevronLeft size={18} />{returnLabel}</button>
        <button disabled={isWatched || !detail} onClick={onAdd}>{isWatched ? "已加入自选" : "加入自选"}</button>
        <button onClick={onRefresh} aria-label="刷新"><RotateCw size={18} /></button>
      </div>
      {!detail || loading ? <div className="skeletonCard" /> : null}
      {detail && quote && latest ? (
        <>
          <article className="quoteCard">
            <h1>{quote.name}</h1>
            <p>{quote.code}</p>
            <strong style={{ color }}>¥{formatPrice(quote.price)}</strong>
            <span style={{ color }}>{formatSigned(quote.change, 3)} {formatSigned(quote.pct)}%</span>
            <small>行情时间 {quote.time}</small>
            <small>成交量 {formatVolume(quote.volume)}</small>
          </article>
          <div className="sixGrid">
            <Metric label="K" value={latest.K.toFixed(2)} color="var(--yellow)" />
            <Metric label="D" value={latest.D.toFixed(2)} color="var(--blue)" />
            <Metric label="J" value={latest.J.toFixed(2)} color="var(--magenta)" />
            <Metric label="MA5" value={latest.MA5.toFixed(3)} />
            <Metric label="MA10" value={latest.MA10.toFixed(3)} />
            <Metric label="MA20" value={latest.MA20.toFixed(3)} />
          </div>
          <section className="analysisCard">
            <h2>技术指标分析</h2>
            <div className="analysisGrid">
              <Metric label="价-MA5" value={ma5Gap.abs.toFixed(2)} color="var(--text)" />
              <Metric label="价-MA10" value={ma10Gap.abs.toFixed(2)} color="var(--text)" />
              <Metric label="J-0" value={Math.abs(latest.J).toFixed(2)} color="var(--text)" />
            </div>
            <div className="analysisSub">
              <span>{ma5Gap.pct.toFixed(2)}%</span>
              <span>{ma10Gap.pct.toFixed(2)}%</span>
              <span>绝对值</span>
            </div>
          </section>
          <section className="chartCard">
            <div className="sectionTitle"><h2>近 7 日股价</h2><span>蜡烛图 + 成交量</span></div>
            <CandleVolumeChart rows={detail.recent} />
          </section>
          <section className="chartCard">
            <div className="sectionTitle"><h2>KDJ 趋势</h2><span>近 30 交易日</span></div>
            <KdjChart rows={detail.kline.slice(-30)} />
          </section>
          <p className="finePrint">数据源 腾讯行情公开接口 · 前复权 · KDJ 本地计算 · 仅供参考</p>
        </>
      ) : null}
    </section>
  );
}

export function SettingsPage() {
  return (
    <section>
      <header className="pageHeader">
        <div>
          <h1>设置</h1>
          <p>轻量 PWA 版本</p>
        </div>
      </header>
      <div className="settingGroup">
        <div><span>部署方式</span><strong>Vercel PWA</strong></div>
        <div><span>数据来源</span><strong>腾讯行情公开接口</strong></div>
        <div><span>自选存储</span><strong>手机本地 localStorage</strong></div>
        <div><span>安装方式</span><strong>浏览器添加到主屏幕</strong></div>
      </div>
      <p className="finePrint">后续可继续加入涨跌色、刷新频率、云端同步等设置。</p>
    </section>
  );
}

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; icon: typeof Star }> = [
    { key: "watch", label: "自选", icon: Star },
    { key: "search", label: "搜索", icon: Search },
    { key: "settings", label: "设置", icon: Settings }
  ];

  return (
    <nav className="bottomNav" aria-label="底部导航">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => onChange(item.key)}>
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
