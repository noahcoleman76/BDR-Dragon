import React from "react";

type Props = {
  label: string;
  value: number | string;
  subtext?: string;
};

const KpiCard: React.FC<Props> = ({ label, value, subtext }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
      <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {subtext && <div className="mt-2 text-xs text-slate-500">{subtext}</div>}
    </div>
  );
};

export default KpiCard;
