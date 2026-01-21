import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { KpiActualsResponse, RangeType } from "../types/kpi";

export function useKpiActuals(rangeType: RangeType) {
  const [data, setData] = useState<KpiActualsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch<KpiActualsResponse>(`/kpi/actuals?rangeType=${rangeType}`);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load KPI actuals");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [rangeType]);

  return { data, loading, error };
}
