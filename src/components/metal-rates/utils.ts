import type { IMetalRate, IMetalType } from "../../libs/interfaces";

export function isGold(metalName: string): boolean {
  return metalName.trim().toUpperCase() === "GOLD";
}

/** paise per gram  →  display value (₹/10g for gold, ₹/g for others) */
export function paiseToDisplay(paise: number, metalName: string): number {
  return isGold(metalName) ? paise / 10 : paise / 100;
}

/** display value  →  paise per gram */
export function displayToPaise(value: number, metalName: string): number {
  return isGold(metalName) ? value * 10 : value * 100;
}

/** Formatted string shown to users */
export function formatRateDisplay(paise: number, metalName: string): string {
  const val = paiseToDisplay(paise, metalName);
  const label = isGold(metalName) ? "/ 10g" : "/ g";
  return `₹${val.toLocaleString("en-IN")} ${label}`;
}

/** Short label for the unit used in input */
export function rateUnit(metalName: string): string {
  return isGold(metalName) ? "₹ / 10g" : "₹ / g";
}

/** Today's rate record for a specific metal from an array of rates */
export function getTodayRate(
  rates: IMetalRate[],
  metalTypeId: string,
  today: string,
): IMetalRate | undefined {
  return rates.find(
    (r) => r.metal_type_id === metalTypeId && r.rate_date === today,
  );
}

/** Returns the most recent rate (any date) for a metal */
export function getLatestRate(
  rates: IMetalRate[],
  metalTypeId: string,
): IMetalRate | undefined {
  return rates
    .filter((r) => r.metal_type_id === metalTypeId)
    .sort((a, b) => b.rate_date.localeCompare(a.rate_date))[0];
}

/** Group rates by metal_type_id */
export function groupByMetal(
  rates: IMetalRate[],
): Record<string, IMetalRate[]> {
  return rates.reduce(
    (acc, r) => {
      (acc[r.metal_type_id] ??= []).push(r);
      return acc;
    },
    {} as Record<string, IMetalRate[]>,
  );
}

/** Compute KPIs for a single metal from its sorted-desc rate list */
export interface MetalKpi {
  latestRate: number | null; // paise/g
  yesterdayRate: number | null;
  changeAmount: number | null; // paise
  changePercent: number | null;
  highestMonth: number | null;
  lowestMonth: number | null;
  avgMonth: number | null;
}

export function computeKpis(
  rates: IMetalRate[],
  today: string,
): MetalKpi {
  if (!rates.length) {
    return {
      latestRate: null,
      yesterdayRate: null,
      changeAmount: null,
      changePercent: null,
      highestMonth: null,
      lowestMonth: null,
      avgMonth: null,
    };
  }

  const sorted = [...rates].sort((a, b) =>
    b.rate_date.localeCompare(a.rate_date),
  );

  const todayRecord = sorted.find((r) => r.rate_date === today);
  const latestRate = todayRecord?.rate_per_gram_paise ?? sorted[0].rate_per_gram_paise;

  // yesterday = the most recent record before today
  const prevRecord = sorted.find((r) => r.rate_date < today);
  const yesterdayRate = prevRecord?.rate_per_gram_paise ?? null;

  const changeAmount =
    yesterdayRate !== null ? latestRate - yesterdayRate : null;
  const changePercent =
    yesterdayRate !== null && yesterdayRate !== 0
      ? (changeAmount! / yesterdayRate) * 100
      : null;

  const values = sorted.map((r) => r.rate_per_gram_paise);
  const highestMonth = Math.max(...values);
  const lowestMonth = Math.min(...values);
  const avgMonth = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

  return {
    latestRate,
    yesterdayRate,
    changeAmount,
    changePercent,
    highestMonth,
    lowestMonth,
    avgMonth,
  };
}

/** Merge rates from multiple metals into a unified chart data array keyed by date */
export function buildChartData(
  rates: IMetalRate[],
  metals: IMetalType[],
): Array<Record<string, string | number>> {
  const dateMap: Record<string, Record<string, number>> = {};

  for (const rate of rates) {
    const metal = metals.find((m) => m.id === rate.metal_type_id);
    if (!metal) continue;
    (dateMap[rate.rate_date] ??= {})[metal.name] = rate.rate_per_gram_paise;
  }

  return Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, metalValues]) => ({ date, ...metalValues }));
}
