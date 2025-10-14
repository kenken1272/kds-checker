import { format } from "date-fns";
import { MAX_ROWS, SalesRow } from "../types/sales";

export type AggregateBucket = {
  signedTotal: number;
  signedQty: number;
  count: number;
};

export type AggregatedSales = {
  total: AggregateBucket;
  byName: Record<string, AggregateBucket>;
  byPricemode: Record<string, AggregateBucket>;
  byHour: Record<string, AggregateBucket>;
  cancelled: { count: number; amount: number };
};

const ensureBucket = (map: Record<string, AggregateBucket>, key: string): AggregateBucket => {
  if (!map[key]) {
    map[key] = { signedTotal: 0, signedQty: 0, count: 0 };
  }
  return map[key];
};

export const aggregate = (rows: SalesRow[]): AggregatedSales => {
  if (rows.length > MAX_ROWS) {
    throw new Error(`Rows exceed maximum allowed (${MAX_ROWS})`);
  }

  const total: AggregateBucket = { signedTotal: 0, signedQty: 0, count: 0 };
  const byName: Record<string, AggregateBucket> = {};
  const byPricemode: Record<string, AggregateBucket> = {};
  const byHour: Record<string, AggregateBucket> = {};
  const cancelled = { count: 0, amount: 0 };

  rows.forEach((row) => {
    total.signedTotal += row.signedTotal;
    total.signedQty += row.signedQty;
    total.count += 1;

    const hourKey = format(row.ts, "yyyy-MM-dd HH:00");

    const nameBucket = ensureBucket(byName, row.name);
    nameBucket.signedTotal += row.signedTotal;
    nameBucket.signedQty += row.signedQty;
    nameBucket.count += 1;

    const modeBucket = ensureBucket(byPricemode, row.pricemode);
    modeBucket.signedTotal += row.signedTotal;
    modeBucket.signedQty += row.signedQty;
    modeBucket.count += 1;

    const hourBucket = ensureBucket(byHour, hourKey);
    hourBucket.signedTotal += row.signedTotal;
    hourBucket.signedQty += row.signedQty;
    hourBucket.count += 1;

    if (row.status === "CANCELLED") {
      cancelled.count += 1;
      cancelled.amount += Math.abs(row.signedTotal);
    }
  });

  return {
    total,
    byName,
    byPricemode,
    byHour,
    cancelled,
  };
};
