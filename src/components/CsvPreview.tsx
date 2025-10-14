"use client";

import { SalesRow } from "../lib/types/sales";

type CsvPreviewProps = {
  rows: SalesRow[];
  maxPreview?: number;
};

const formatNumber = (value: number) => value.toLocaleString();

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);

export const CsvPreview = ({ rows, maxPreview = 50 }: CsvPreviewProps) => {
  const previewRows = rows.slice(0, maxPreview);

  if (previewRows.length === 0) {
    return (
      <div className="card-surface rounded-2xl border border-dashed border-slate-300 px-6 py-8 text-center text-sm text-slate-500">
        プレビューできる行がありません
      </div>
    );
  }

  return (
    <div className="card-surface table-scroll overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl">
      <div className="max-h-[480px] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white/90 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-[0.3em] text-slate-500">
              <th className="px-4 py-3 font-semibold">時刻</th>
              <th className="px-4 py-3 font-semibold">メニュー</th>
              <th className="px-4 py-3 text-right font-semibold">数量</th>
              <th className="px-4 py-3 font-semibold">価格モード</th>
              <th className="px-4 py-3 text-right font-semibold">金額</th>
              <th className="px-4 py-3 font-semibold">ステータス</th>
              <th className="px-4 py-3 text-right font-semibold">Signed Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Signed Total</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, index) => {
              const isCancelled = row.status === "CANCELLED";
              return (
                <tr
                  key={`${row.ts.toISOString()}-${index}`}
                  className={`transition hover:bg-blue-50/60 ${index % 2 === 0 ? "bg-white/90" : "bg-white/70"}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTime(row.ts)}</td>
                  <td className="px-4 py-3 text-slate-800">{row.name}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatNumber(row.qty)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.pricemode}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">¥{formatNumber(row.linetotal)}</td>
                  <td className={`px-4 py-3 font-semibold ${isCancelled ? "text-rose-500" : "text-emerald-600"}`}>
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatNumber(row.signedQty)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${isCancelled ? "text-rose-500" : "text-slate-800"}`}>
                    ¥{formatNumber(row.signedTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > maxPreview && (
        <div className="border-t border-white/60 bg-white/75 px-4 py-2 text-right text-xs text-slate-500">
          {maxPreview.toLocaleString()} 行のみ表示中 (全 {rows.length.toLocaleString()} 行)
        </div>
      )}
    </div>
  );
};
