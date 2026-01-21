import React, { useMemo, useState } from "react";
import type { RangeType } from "../types/kpi";
import { useKpiForecast } from "../hooks/useKpiForecast";

const rangeOptions: { label: string; value: RangeType }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" }
];

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}
function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${Math.round(n)}%`;
}

const ForecastPage: React.FC = () => {
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const { data, loading, error } = useKpiForecast(rangeType);

  const rows = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return [
      { key: "Calls made", v: k.calls },
      { key: "Emails sent", v: k.emails },
      { key: "Meetings booked", v: k.meetingsBooked },
      { key: "Meetings held", v: k.meetingsHeld },
      { key: "Opportunities created", v: k.opportunitiesCreated },
      { key: "Clean opportunities", v: k.cleanOpportunities }
    ];
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Forecast</h1>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Pacing vs quota (Option B)
            </div>
          </div>

          <div className="flex gap-2">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRangeType(opt.value)}
                className={[
                  "px-3 py-1 rounded text-sm border",
                  rangeType === opt.value
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "border-slate-300 dark:border-slate-600"
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <div className="mt-3 text-xs text-slate-500">
            Elapsed: {Math.round(data.elapsedFraction * 100)}%
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          Loading forecast...
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr className="text-left">
                  <th className="p-3">KPI</th>
                  <th className="p-3">Actual so far</th>
                  <th className="p-3">Expected by now</th>
                  <th className="p-3">Projected final</th>
                  <th className="p-3">Quota</th>
                  <th className="p-3">Pace</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="p-3 font-medium">{r.key}</td>
                    <td className="p-3">{fmt(r.v.actual)}</td>
                    <td className="p-3">{fmt(r.v.expected)}</td>
                    <td className="p-3">{fmt(r.v.projected)}</td>
                    <td className="p-3">{fmt(r.v.quota)}</td>
                    <td className="p-3">{fmtPct(r.v.pacePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 text-xs text-slate-500">
            Note: Day/Week quotas are scaled from monthly quotas (MVP approximation).
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastPage;
