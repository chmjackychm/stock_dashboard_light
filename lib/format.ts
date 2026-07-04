export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return value >= 100 ? value.toFixed(1) : value.toFixed(3);
}

export function formatSigned(value: number, digits = 2): string {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

export function formatVolume(volumeHand: number): string {
  if (!Number.isFinite(volumeHand)) {
    return "--";
  }
  if (Math.abs(volumeHand) >= 10000) {
    return `${(volumeHand / 10000).toFixed(2)}万手`;
  }
  return `${Math.round(volumeHand)}手`;
}

export function colorByChange(value: number, redUp = true): string {
  if (value >= 0) {
    return redUp ? "var(--red)" : "var(--green)";
  }
  return redUp ? "var(--green)" : "var(--red)";
}

export function priceGap(price: number, baseline: number): { abs: number; pct: number } {
  if (!Number.isFinite(price) || !Number.isFinite(baseline) || baseline === 0) {
    return { abs: 0, pct: 0 };
  }
  const abs = Math.abs(price - baseline);
  return { abs, pct: (abs / Math.abs(baseline)) * 100 };
}
