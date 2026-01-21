import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { AdminMarket, AdminUser, IntegrationStatus } from "../types/admin";

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create market form
  const [mName, setMName] = useState("");
  const [mCalls, setMCalls] = useState<number>(0);
  const [mEmails, setMEmails] = useState<number>(0);
  const [mMeetings, setMMeetings] = useState<number>(0);
  const [mCleanOpps, setMCleanOpps] = useState<number>(0);

  // user edit selection
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const selectedMarketIds = useMemo(() => {
    const set = new Set<string>();
    selectedUser?.markets.forEach((m) => set.add(m.id));
    return set;
  }, [selectedUser]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, m, s] = await Promise.all([
        apiFetch<AdminUser[]>("/admin/users"),
        apiFetch<AdminMarket[]>("/admin/markets"),
        apiFetch<IntegrationStatus>("/admin/integration-status")
      ]);
      setUsers(u);
      setMarkets(m);
      setStatus(s);
      if (!selectedUserId && u.length > 0) setSelectedUserId(u[0].id);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMarket = async () => {
    if (!mName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/admin/markets", {
        method: "POST",
        body: JSON.stringify({
          name: mName.trim(),
          quotaCalls: mCalls,
          quotaEmails: mEmails,
          quotaMeetingsBooked: mMeetings,
          quotaCleanOpportunities: mCleanOpps
        })
      });
      setMName("");
      setMCalls(0);
      setMEmails(0);
      setMMeetings(0);
      setMCleanOpps(0);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to create market");
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (userId: string, patch: any) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to update user");
    } finally {
      setBusy(false);
    }
  };

  const toggleMarketForUser = async (marketId: string) => {
    if (!selectedUser) return;
    const current = new Set(selectedUser.markets.map((m) => m.id));
    if (current.has(marketId)) current.delete(marketId);
    else current.add(marketId);

    await updateUser(selectedUser.id, { marketIds: Array.from(current) });
  };

  const runSync = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/admin/sync", { method: "POST" });
      const s = await apiFetch<IntegrationStatus>("/admin/integration-status");
      setStatus(s);
    } catch (e: any) {
      setError(e?.message || "Failed to run sync");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-semibold">Admin</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Manage users, markets, and manual sync.
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          Loading admin data...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Sync card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold">Manual Sync</h2>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Salesforce: {status?.salesforceStatus ?? "—"} <br />
              Outreach: {status?.outreachStatus ?? "—"}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Last sync:{" "}
              {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}
            </div>
            <button
              disabled={busy}
              onClick={runSync}
              className="mt-3 w-full px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
            >
              {busy ? "Working..." : "Run Sync (stub)"}
            </button>
          </div>

          {/* Markets card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold">Markets</h2>

            <div className="mt-3 space-y-2">
              <input
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="Market name"
                value={mName}
                onChange={(e) => setMName(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  type="number"
                  value={mCalls}
                  onChange={(e) => setMCalls(Number(e.target.value))}
                  placeholder="Calls quota"
                />
                <input
                  className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  type="number"
                  value={mEmails}
                  onChange={(e) => setMEmails(Number(e.target.value))}
                  placeholder="Emails quota"
                />
                <input
                  className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  type="number"
                  value={mMeetings}
                  onChange={(e) => setMMeetings(Number(e.target.value))}
                  placeholder="Meetings quota"
                />
                <input
                  className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  type="number"
                  value={mCleanOpps}
                  onChange={(e) => setMCleanOpps(Number(e.target.value))}
                  placeholder="Clean opps quota"
                />
              </div>

              <button
                disabled={busy}
                onClick={createMarket}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
              >
                Create Market
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {markets.map((m) => (
                <div
                  key={m.id}
                  className="p-2 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-slate-500">
                    Quotas: Calls {m.quotaCalls}, Emails {m.quotaEmails}, Meetings{" "}
                    {m.quotaMeetingsBooked}, Clean Opps {m.quotaCleanOpportunities}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users + assignments */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold">Users</h2>

            <div className="mt-3">
              <select
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                value={selectedUserId ?? ""}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <div className="mt-4 space-y-3">
                <div className="text-sm">
                  <div className="font-medium">{selectedUser.email}</div>
                  <div className="text-xs text-slate-500">
                    Role: {selectedUser.role} • Active: {selectedUser.isActive ? "Yes" : "No"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      updateUser(selectedUser.id, {
                        role: selectedUser.role === "ADMIN" ? "BASIC" : "ADMIN"
                      })
                    }
                    className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                  >
                    Toggle Role
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => updateUser(selectedUser.id, { isActive: !selectedUser.isActive })}
                    className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                  >
                    {selectedUser.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium mb-2">Assigned Markets</div>
                  <div className="space-y-2">
                    {markets.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <span className="truncate">{m.name}</span>
                        <input
                          type="checkbox"
                          checked={selectedMarketIds.has(m.id)}
                          onChange={() => toggleMarketForUser(m.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
