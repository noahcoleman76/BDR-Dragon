import React, { useMemo, useState } from "react";
import KpiCard from "../components/KpiCard";
import { useKpiActuals } from "../hooks/useKpiActuals";
import type { RangeType } from "../types/kpi";

const rangeOptions: { label: string; value: RangeType }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" }
];

const DashboardPage: React.FC = () => {
  const [rangeType, setRangeType] = useState<RangeType>("month");
  const { data, loading, error } = useKpiActuals(rangeType);

  const cards = useMemo(() => {
    const m = data?.metrics;
    return [
      { label: "Calls made", value: m?.calls ?? 0 },
      { label: "Emails sent", value: m?.emails ?? 0 },
      { label: "Meetings booked", value: m?.meetingsBooked ?? 0 },
      { label: "Meetings held", value: m?.meetingsHeld ?? 0 },
      { label: "Opportunities created", value: m?.opportunitiesCreated ?? 0 },
      { label: "Clean opportunities", value: m?.cleanOpportunities ?? 0 }
    ];
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Actuals for the selected period
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

        <div className="mt-3 text-xs text-slate-500">
          {data ? (
            <>
              From {new Date(data.startDate).toLocaleDateString()} to{" "}
              {new Date(data.endDate).toLocaleDateString()}
            </>
          ) : (
            " "
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          Loading KPI actuals...
        </div>
      )}

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <KpiCard key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
