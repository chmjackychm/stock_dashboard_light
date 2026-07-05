"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { formatPrice, formatVolume } from "@/lib/format";
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

function xScale(index: number, total: number, width: number) {
  return 18 + (index / Math.max(total - 1, 1)) * (width - 36);
}

function points(rows: KlineRow[], key: keyof KlineRow, min: number, max: number, width: number, height: number) {
  return rows
    .map((row, index) => {
      const x = xScale(index, rows.length, width);
      const y = yScale(Number(row[key]), min, max, height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function TooltipBox({
  x,
  y,
  width,
  height,
  children
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <foreignObject x={x} y={y} width={width} height={height} className="chartTooltipObject">
      <div className="chartTooltip">{children}</div>
    </foreignObject>
  );
}

export function CandleVolumeChart({ rows }: ChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 360;
  const priceHeight = 190;
  const volumeHeight = 76;
  const priceRange = bounds(rows.flatMap((row) => [row.low, row.high, row.MA5, row.MA10, row.MA20]));
  const maxVolume = Math.max(...rows.map((row) => row.volume), 1);
  const hovered = hoverIndex === null ? null : rows[hoverIndex];
  const hoverX = hoverIndex === null ? 0 : xScale(hoverIndex, rows.length, width);
  const tooltipX = hoverX > width - 150 ? hoverX - 146 : hoverX + 10;

  return (
    <svg className="chartSvg" viewBox={`0 0 ${width} ${priceHeight + volumeHeight + 22}`} role="img" onMouseLeave={() => setHoverIndex(null)}>
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="12" x2="348" y1={22 + line * 42} y2={22 + line * 42} className="gridLine" />
      ))}
      {rows.map((row, index) => {
        const x = xScale(index, rows.length, width);
        const step = (width - 36) / Math.max(rows.length - 1, 1);
        const barWidth = Math.max(3, Math.min(10, step * 0.58));
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
            <rect x={x - barWidth / 2} y={bodyY} width={barWidth} height={bodyH} rx="1.5" className={up ? "upFill" : "downFill"} />
            <rect
              x={x - barWidth / 2}
              y={priceHeight + 14 + 56 - volumeH}
              width={barWidth}
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
      {hovered ? (
        <>
          <line x1={hoverX} x2={hoverX} y1="10" y2={priceHeight + volumeHeight + 4} className="hoverGuide" />
          <circle cx={hoverX} cy={yScale(hovered.close, priceRange.min, priceRange.max, priceHeight)} r="4" className="hoverDot" />
          <TooltipBox x={tooltipX} y={18} width={136} height={138}>
            <strong>{hovered.date}</strong>
            <span>开 {formatPrice(hovered.open)} 高 {formatPrice(hovered.high)}</span>
            <span>低 {formatPrice(hovered.low)} 收 {formatPrice(hovered.close)}</span>
            <span>MA5 {formatPrice(hovered.MA5)}</span>
            <span>MA10 {formatPrice(hovered.MA10)}</span>
            <span>量 {formatVolume(hovered.volume)}</span>
          </TooltipBox>
        </>
      ) : null}
      {rows.map((row, index) => {
        const x = xScale(index, rows.length, width);
        const step = (width - 36) / Math.max(rows.length - 1, 1);
        return (
          <rect
            key={`hover-${row.date}`}
            x={x - step / 2}
            y="0"
            width={step}
            height={priceHeight + volumeHeight + 22}
            className="hoverTarget"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
          />
        );
      })}
    </svg>
  );
}

export function KdjChart({ rows }: ChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 360;
  const height = 170;
  const range = bounds(rows.flatMap((row) => [row.K, row.D, row.J, 0, 100]));
  const hovered = hoverIndex === null ? null : rows[hoverIndex];
  const hoverX = hoverIndex === null ? 0 : xScale(hoverIndex, rows.length, width);
  const tooltipX = hoverX > width - 130 ? hoverX - 126 : hoverX + 10;

  return (
    <svg className="chartSvg" viewBox={`0 0 ${width} ${height}`} role="img" onMouseLeave={() => setHoverIndex(null)}>
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="12" x2="348" y1={18 + line * 36} y2={18 + line * 36} className="gridLine" />
      ))}
      <polyline points={points(rows, "K", range.min, range.max, width, height)} className="kLine" />
      <polyline points={points(rows, "D", range.min, range.max, width, height)} className="dLine" />
      <polyline points={points(rows, "J", range.min, range.max, width, height)} className="jLine" />
      <text x="18" y="160" className="axisText">{rows[0]?.date}</text>
      <text x="282" y="160" className="axisText">{rows[rows.length - 1]?.date}</text>
      {hovered ? (
        <>
          <line x1={hoverX} x2={hoverX} y1="10" y2="148" className="hoverGuide" />
          <circle cx={hoverX} cy={yScale(hovered.K, range.min, range.max, height)} r="3.5" className="hoverDot kDot" />
          <circle cx={hoverX} cy={yScale(hovered.D, range.min, range.max, height)} r="3.5" className="hoverDot dDot" />
          <circle cx={hoverX} cy={yScale(hovered.J, range.min, range.max, height)} r="3.5" className="hoverDot jDot" />
          <TooltipBox x={tooltipX} y={18} width={116} height={92}>
            <strong>{hovered.date}</strong>
            <span>K {hovered.K.toFixed(2)}</span>
            <span>D {hovered.D.toFixed(2)}</span>
            <span>J {hovered.J.toFixed(2)}</span>
          </TooltipBox>
        </>
      ) : null}
      {rows.map((row, index) => {
        const x = xScale(index, rows.length, width);
        const step = (width - 36) / Math.max(rows.length - 1, 1);
        return (
          <rect
            key={`hover-${row.date}`}
            x={x - step / 2}
            y="0"
            width={step}
            height={height}
            className="hoverTarget"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
          />
        );
      })}
    </svg>
  );
}
