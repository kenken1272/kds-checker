"use client";

import { AggregatedSales, AggregateBucket } from "../lib/agg/sales";

type BreakdownTablesProps = {
  summary: AggregatedSales | null;
};

type Entry = AggregateBucket & { key: string };

const formatNumber = (value: number) => value.toLocaleString();

const toEntries = (input: Record<string, AggregateBucket>, limit: number): Entry[] =>
  Object.entries(input)
    .map(([key, bucket]) => ({ key, ...bucket }))
    .sort((a, b) => Math.abs(b.signedTotal) - Math.abs(a.signedTotal))
    .slice(0, limit);

const EntryList = ({ title, entries }: { title: string; entries: Entry[] }) => {
  const maxTotal = Math.max(...entries.map((entry) => Math.abs(entry.signedTotal)), 0) || 1;

  return (
    <div className="card-surface h-full rounded-2xl border border-white/60 bg-white/80 px-5 py-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">{title}</h3>
        <span className="text-xs font-semibold text-slate-400">TOP {entries.length}</span>
      </div>
      <div className="table-scroll mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            データがありません
          </p>
        ) : (
          entries.map((entry) => {
            const barWidth = `${Math.min(100, Math.round((Math.abs(entry.signedTotal) / maxTotal) * 100))}%`;
            const isNegative = entry.signedTotal < 0;
            return (
              <div
                key={entry.key}
                className="rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{entry.key}</p>
                    <p className="text-xs text-slate-500">
                      {formatNumber(entry.count)} 件 / Signed Qty {formatNumber(entry.signedQty)}
                    </p>
                  </div>
                  <div className={`text-right text-sm font-semibold ${isNegative ? "text-rose-500" : "text-slate-800"}`}>
                    ¥{formatNumber(entry.signedTotal)}
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`${isNegative ? "bg-rose-400/70" : "bg-blue-500/70"} block h-full rounded-full transition-all`}
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const BreakdownTables = ({ summary }: BreakdownTablesProps) => {
  if (!summary) {
    return null;
  }

  const nameEntries = toEntries(summary.byName, 15);
  const modeEntries = toEntries(summary.byPricemode, 10);
  const hourEntries = toEntries(summary.byHour, 24);

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <EntryList title="メニュー別" entries={nameEntries} />
      <EntryList title="価格モード別" entries={modeEntries} />
      <EntryList title="時間帯別" entries={hourEntries} />
    </div>
  );
};
