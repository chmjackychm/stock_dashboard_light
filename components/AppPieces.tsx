"use client";

import { ChevronLeft, RotateCw, Search, Settings, Star } from "lucide-react";
import { CandleVolumeChart, KdjChart } from "@/components/MiniCharts";
import { colorByChange, formatPrice, formatSigned, formatVolume, priceGap } from "@/lib/format";
import type { DetailResponse, KlineRow, Quote } from "@/lib/types";

type Tab = "watch" | "search" | "settings";
type SignalTone = "bullish" | "neutral" | "bearish";
type SignalState = {
  label: string;
  value: string;
  score?: number;
  description?: string;
};
type TechnicalSignal = {
  score: number;
  signal: string;
  action: string;
  tone: SignalTone;
  states: SignalState[];
  triggerNotes: string[];
  disclaimer: string;
};

export function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="metricPill">
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
    </div>
  );
}

function averageVolume(rows: KlineRow[], count: number): number {
  const slice = rows.slice(-count);
  if (!slice.length) {
    return 0;
  }
  return slice.reduce((sum, row) => sum + row.volume, 0) / slice.length;
}

function classifyMaState(price: number, latest: KlineRow): SignalState {
  const maFacts = `价格 ${formatPrice(price)}，MA5 ${formatPrice(latest.MA5)}，MA10 ${formatPrice(latest.MA10)}，MA20 ${formatPrice(latest.MA20)}。`;
  if (price > latest.MA5 && price > latest.MA10 && price > latest.MA20) {
    return { label: "均线", value: "强势区", score: 2, description: `${maFacts}价格站在三条均线上方，趋势方向偏强。` };
  }
  if (price > latest.MA10 && price < latest.MA5) {
    return { label: "均线", value: "中性偏强", score: 1, description: `${maFacts}价格低于 MA5 但仍高于 MA10，属于短期回调、中期趋势仍在。` };
  }
  if (price < latest.MA10 && price > latest.MA20) {
    return { label: "均线", value: "中性偏弱", score: -1, description: `${maFacts}价格跌破 MA5 与 MA10，但仍高于 MA20，短中期转弱，长期线暂有支撑。` };
  }
  if (price < latest.MA5 && price < latest.MA10 && price < latest.MA20) {
    return { label: "均线", value: "弱势区", score: -2, description: `${maFacts}价格跌破 MA5、MA10 与 MA20，三条均线均在上方，趋势方向偏弱。` };
  }
  return { label: "均线", value: "夹层震荡", score: 0, description: `${maFacts}价格处在均线夹层，暂未形成明确单边趋势。` };
}

function classifyVolumeState(volume: number, avgVolume5: number): SignalState & { factor: number } {
  if (!avgVolume5) {
    return { label: "量能", value: "无基准", factor: 1, description: "近 5 日均量不足" };
  }
  if (volume > avgVolume5 * 1.5) {
    return { label: "量能", value: "放量", factor: 1.5, description: `当日成交量 ${formatVolume(volume)}，高于近 5 日均量 ${formatVolume(avgVolume5)} 的 1.5 倍，当前方向信号被放大。` };
  }
  if (volume < avgVolume5 * 0.7) {
    return { label: "量能", value: "缩量", factor: 0.5, description: `当日成交量 ${formatVolume(volume)}，低于近 5 日均量 ${formatVolume(avgVolume5)} 的 0.7 倍，当前方向信号需要打折。` };
  }
  return { label: "量能", value: "正常量", factor: 1, description: `当日成交量 ${formatVolume(volume)}，接近近 5 日均量 ${formatVolume(avgVolume5)}，量能不额外放大方向。` };
}

function classifyJState(j: number): SignalState {
  if (j < 20) {
    return { label: "J值", value: "超卖区", score: 2, description: `J 值 ${j.toFixed(2)}，低于 20，处于超卖区，技术上有反弹潜力。` };
  }
  if (j < 50) {
    return { label: "J值", value: "中性偏冷", score: 1, description: `J 值 ${j.toFixed(2)}，位于 20~50，位置偏冷但未到极端超卖。` };
  }
  if (j <= 80) {
    return { label: "J值", value: "中性偏热", score: -1, description: `J 值 ${j.toFixed(2)}，位于 50~80，位置偏热，上行空间开始收窄。` };
  }
  return { label: "J值", value: "超买区", score: -2, description: `J 值 ${j.toFixed(2)}，高于 80，处于超买区，回调风险提高。` };
}

function classifyPctState(pct: number): SignalState {
  if (pct > 3) {
    return { label: "动量", value: "强阳", score: 2, description: `当日涨跌幅 ${formatSigned(pct)}%，大于 3%，日内动量强。` };
  }
  if (pct >= 1) {
    return { label: "动量", value: "温和上涨", score: 1, description: `当日涨跌幅 ${formatSigned(pct)}%，位于 1%~3%，日内偏多但不极端。` };
  }
  if (pct > -1) {
    return { label: "动量", value: "横盘", score: 0, description: `当日涨跌幅 ${formatSigned(pct)}%，位于 -1%~1%，单日动量中性。` };
  }
  if (pct >= -3) {
    return { label: "动量", value: "温和下跌", score: -1, description: `当日涨跌幅 ${formatSigned(pct)}%，位于 -3%~-1%，日内偏空。` };
  }
  return { label: "动量", value: "强阴", score: -2, description: `当日涨跌幅 ${formatSigned(pct)}%，跌幅超过 3%，抛压较强。` };
}

function buildTechnicalSignal(quote: Quote, latest: KlineRow, kline: KlineRow[]): TechnicalSignal {
  const avgVolume5 = averageVolume(kline, 5);
  const maState = classifyMaState(quote.price, latest);
  const volumeState = classifyVolumeState(quote.volume, avgVolume5);
  const jState = classifyJState(latest.J);
  const pctState = classifyPctState(quote.pct);
  const baseScore = (maState.score ?? 0) + (jState.score ?? 0) + (pctState.score ?? 0);
  const score = baseScore * volumeState.factor;
  const recent3 = kline.slice(-3);
  const previous = kline[kline.length - 2];
  const hasLowerShadow = quote.low < Math.min(quote.open, quote.price);
  const buyReady = quote.price > latest.MA10 && quote.volume >= avgVolume5 && latest.J <= 60 && (quote.pct > 0 || hasLowerShadow);
  const sellTriggered = quote.price < latest.MA20 && volumeState.value === "放量";
  const ma5TurningDown = Boolean(previous && latest.MA5 < previous.MA5);
  const belowMa5ThreeDays = recent3.length === 3 && recent3.every((row) => row.close < row.MA5);
  const overheatTriggered = latest.J > 85 && volumeState.value === "缩量";
  const trendBreakTriggered = belowMa5ThreeDays && ma5TurningDown;
  const sellReasons = [
    sellTriggered ? `价格 ${formatPrice(quote.price)} 跌破 MA20（${formatPrice(latest.MA20)}）且成交量为${volumeState.value}` : null,
    overheatTriggered ? `J 值 ${latest.J.toFixed(2)} 高于 85 且成交量缩量` : null,
    trendBreakTriggered ? `连续 3 日收盘低于 MA5，且 MA5 从 ${previous ? formatPrice(previous.MA5) : "-"} 下弯到 ${formatPrice(latest.MA5)}` : null
  ].filter(Boolean);

  let signal = "中性";
  let action = "观望，等待更明确的触发条件";
  let tone: SignalTone = "neutral";
  if (score >= 4) {
    signal = "强买入信号";
    action = buyReady ? "可以进场" : "信号偏强，但建议等待触发条件确认";
    tone = "bullish";
  } else if (score >= 2) {
    signal = "偏多，信号偏弱";
    action = "轻仓试探或等确认";
    tone = "bullish";
  } else if (score <= -4) {
    signal = "强卖出信号";
    action = "减仓或离场";
    tone = "bearish";
  } else if (score <= -2) {
    signal = "偏空，信号偏弱";
    action = "不加仓，考虑减仓";
    tone = "bearish";
  }

  const triggerNotes = [
    buyReady
      ? `买入触发：价格 ${formatPrice(quote.price)} 已站回 MA10（${formatPrice(latest.MA10)}），量能达标，J 值 ${latest.J.toFixed(2)} 未过热。`
      : `买入触发：当前价格 ${formatPrice(quote.price)}、MA10 ${formatPrice(latest.MA10)}，需等待价格站回 MA10、量能达标且 J 值不过热。`,
    sellReasons.length
      ? `减仓触发：${sellReasons.join("；")}。`
      : `减仓触发：重点观察是否跌破 MA20（${formatPrice(latest.MA20)}）并放量、J 值是否高于 85 后缩量、是否连续 3 日低于 MA5。`,
    "止损：入场后跌幅超过预设阈值且无均线支撑，应无条件执行"
  ];

  return {
    score,
    signal,
    action,
    tone,
    states: [maState, volumeState, jState, pctState],
    triggerNotes,
    disclaimer: "仅为技术分析框架，不构成投资建议"
  };
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
  const monthlyRows = detail?.kline.slice(-30) ?? [];
  const technicalSignal = quote && latest && detail ? buildTechnicalSignal(quote, latest, detail.kline) : null;

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
          <div className="detailDashboard">
            <div className="detailSummaryColumn">
              <article className="quoteCard">
                <h1>{quote.name}</h1>
                <p>{quote.code}</p>
                <strong style={{ color }}>¥{formatPrice(quote.price)}</strong>
                <span style={{ color }}>{formatSigned(quote.change, 3)} {formatSigned(quote.pct)}%</span>
                <small>行情时间 {quote.time}</small>
                <small>成交量 {formatVolume(quote.volume)}</small>
              </article>
              <section className="chartCard compactChartCard">
                <div className="sectionTitle"><h2>近 30 交易日股价</h2><span>蜡烛图 + 成交量</span></div>
                <CandleVolumeChart rows={monthlyRows} />
              </section>
              <section className="chartCard compactChartCard">
                <div className="sectionTitle">
                  <h2>KDJ 趋势</h2>
                  <div className="kdjLegend" aria-label="KDJ 指标图例">
                    <span><i className="kLegend" />K</span>
                    <span><i className="dLegend" />D</span>
                    <span><i className="jLegend" />J</span>
                  </div>
                </div>
                <KdjChart rows={monthlyRows} />
              </section>
            </div>
            <div className="detailAnalysisColumn">
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
                {technicalSignal ? (
                  <article className={`signalCard ${technicalSignal.tone}`}>
                    <div className="signalHeader">
                      <div>
                        <span>综合建议</span>
                        <strong>{technicalSignal.signal}</strong>
                      </div>
                      <b>{technicalSignal.score > 0 ? "+" : ""}{technicalSignal.score.toFixed(1)}</b>
                    </div>
                    <p className="signalAction">{technicalSignal.action}</p>
                    <div className="signalStateGrid">
                      {technicalSignal.states.map((state) => (
                        <div key={state.label} className="signalState">
                          <span>{state.label}</span>
                          <strong>{state.value}</strong>
                          {state.description ? <p>{state.description}</p> : null}
                        </div>
                      ))}
                    </div>
                    <div className="signalNotes">
                      {technicalSignal.triggerNotes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                    <small>{technicalSignal.disclaimer}</small>
                  </article>
                ) : null}
              </section>
            </div>
          </div>
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
          <p>电脑端 Web App 版本</p>
        </div>
      </header>
      <div className="settingGroup">
        <div><span>运行方式</span><strong>浏览器打开 / 可安装为桌面应用</strong></div>
        <div><span>数据来源</span><strong>腾讯行情公开接口</strong></div>
        <div><span>自选存储</span><strong>本机浏览器 localStorage</strong></div>
        <div><span>安装方式</span><strong>浏览器菜单安装应用</strong></div>
      </div>
      <p className="finePrint">自选会保存在当前电脑的当前浏览器里；清理网站数据或换浏览器后需要重新添加。</p>
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
