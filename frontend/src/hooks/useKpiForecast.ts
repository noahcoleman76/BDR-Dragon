import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import type { RangeType } from "../types/kpi";
import type { KpiForecastResponse } from "../types/forecast";

export function useKpiForecast(rangeType: RangeType) {
  const [data, setData] = useState<KpiForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<KpiForecastResponse>(`/kpi/forecast?rangeType=${rangeType}`);
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load forecast");
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
