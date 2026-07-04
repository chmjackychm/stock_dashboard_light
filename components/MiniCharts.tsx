"use client";

import type { KlineRow } from "@/lib/types";

type ChartProps = {
  rows: KlineRow[];
};

function bounds(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.12;
  return { min: min - pad, max: max + pad };
}

function yScale(value: number, min: number, max: number, height: number, top = 12, bottom = 18) {
  return top + ((max - value) / (max - min || 1)) * (height - top - bottom);
}

function points(rows: KlineRow[], key: keyof KlineRow, min: number, max: number, width: number, height: number) {
  return rows
    .map((row, index) => {
      const x = 16 + (index / Math.max(rows.length - 1, 1)) * (width - 32);
      const y = yScale(Number(row[key]), min, max, height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function CandleVolumeChart({ rows }: ChartProps) {
  const width = 360;
  const priceHeight = 190;
  const volumeHeight = 76;
  const priceRange = bounds(rows.flatMap((row) => [row.low, row.high, row.MA5, row.MA10, row.MA20]));
  const maxVolume = Math.max(...rows.map((row) => row.volume), 1);

  return (
    <svg className="chartSvg" viewBox={`0 0 ${width} ${priceHeight + volumeHeight + 22}`} role="img">
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="12" x2="348" y1={22 + line * 42} y2={22 + line * 42} className="gridLine" />
      ))}
      {rows.map((row, index) => {
        const x = 18 + (index / Math.max(rows.length - 1, 1)) * 324;
        const up = row.close >= row.open;
        const yOpen = yScale(row.open, priceRange.min, priceRange.max, priceHeight);
        const yClose = yScale(row.close, priceRange.min, priceRange.max, priceHeight);
        const yHigh = yScale(row.high, priceRange.min, priceRange.max, priceHeight);
        const yLow = yScale(row.low, priceRange.min, priceRange.max, priceHeight);
        const bodyY = Math.min(yOpen, yClose);
        const bodyH = Math.max(3, Math.abs(yOpen - yClose));
        const volumeH = (row.volume / maxVolume) * 56;
        return (
          <g key={row.date}>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} className={up ? "upStroke" : "downStroke"} />
            <rect x={x - 5} y={bodyY} width="10" height={bodyH} rx="1.5" className={up ? "upFill" : "downFill"} />
            <rect
              x={x - 5}
              y={priceHeight + 14 + 56 - volumeH}
              width="10"
              height={volumeH}
              rx="1.5"
              className={up ? "upFill" : "downFill"}
            />
          </g>
        );
      })}
      <polyline points={points(rows, "MA5", priceRange.min, priceRange.max, width, priceHeight)} className="ma5Line" />
      <polyline points={points(rows, "MA10", priceRange.min, priceRange.max, width, priceHeight)} className="ma10Line" />
      <polyline points={points(rows, "MA20", priceRange.min, priceRange.max, width, priceHeight)} className="ma20Line" />
      <text x="18" y={priceHeight + volumeHeight + 15} className="axisText">{rows[0]?.date}</text>
      <text x="282" y={priceHeight + volumeHeight + 15} className="axisText">{rows[rows.length - 1]?.date}</text>
    </svg>
  );
}

export function KdjChart({ rows }: ChartProps) {
  const width = 360;
  const height = 170;
  const range = bounds(rows.flatMap((row) => [row.K, row.D, row.J, 0, 100]));

  return (
    <svg className="chartSvg" viewBox={`0 0 ${width} ${height}`} role="img">
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="12" x2="348" y1={18 + line * 36} y2={18 + line * 36} className="gridLine" />
      ))}
      <polyline points={points(rows, "K", range.min, range.max, width, height)} className="kLine" />
      <polyline points={points(rows, "D", range.min, range.max, width, height)} className="dLine" />
      <polyline points={points(rows, "J", range.min, range.max, width, height)} className="jLine" />
      <text x="18" y="160" className="axisText">{rows[0]?.date}</text>
      <text x="282" y="160" className="axisText">{rows[rows.length - 1]?.date}</text>
    </svg>
  );
}
