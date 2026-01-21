import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";

type Market = {
  id: string;
  name: string;
  geographicDescription: string | null;
  accountExecutives: string | null;
  managerName?: string | null;
  startDate?: string | null;
};

type MarketMeResponse = {
  markets: Market[];
};

function splitAEs(aes: string | null | undefined): string[] {
  if (!aes) return [];
  return aes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const MarketPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<MarketMeResponse>("/market/me");
      setMarkets(res.markets ?? []);
    } catch (e: any) {
      setError(e?.message || "Failed to load markets");
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const primary = useMemo(() => markets[0] ?? null, [markets]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-semibold">Market</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Your assigned markets (read-only).
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          Loading...
        </div>
      ) : markets.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          <div className="font-semibold">No markets assigned</div>
          <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Ask an admin to assign you to a market in the Admin tab.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Primary market card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{primary?.name ?? "Market"}</h2>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  {primary?.geographicDescription ? (
                    primary.geographicDescription
                  ) : (
                    <span className="italic text-slate-500">No geographic description set.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-500">Account Executives</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {splitAEs(primary?.accountExecutives).length > 0 ? (
                  splitAEs(primary?.accountExecutives).map((ae) => (
                    <span
                      key={ae}
                      className="text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      {ae}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-300 italic">
                    None listed.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* All markets list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <div className="font-semibold">My Markets</div>
            <div className="mt-3 space-y-2">
              {markets.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {splitAEs(m.accountExecutives).length > 0
                      ? `${splitAEs(m.accountExecutives).length} AE(s)`
                      : "No AEs"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
