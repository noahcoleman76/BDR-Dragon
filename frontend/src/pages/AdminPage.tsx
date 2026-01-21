import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { AdminMarket, AdminUser, IntegrationStatus } from "../types/admin";

type Role = "ADMIN" | "BASIC";

const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Create / Edit Market ----
  const [mName, setMName] = useState("");
  const [mGeo, setMGeo] = useState("");
  const [mAes, setMAes] = useState(""); // comma-separated string
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);

  // ---- User selection + create form ----
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Create user form
  const [uEmail, setUEmail] = useState("");
  const [uRole, setURole] = useState<Role>("BASIC");
  const [uNickname, setUNickname] = useState("");
  const [uTempPassword, setUTempPassword] = useState("");
  const [uQuotaCalls, setUQuotaCalls] = useState(0);
  const [uQuotaEmails, setUQuotaEmails] = useState(0);
  const [uQuotaMeetingsBooked, setUQuotaMeetingsBooked] = useState(0);
  const [uQuotaCleanOpps, setUQuotaCleanOpps] = useState(0);
  const [uMarketIds, setUMarketIds] = useState<string[]>([]);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const selectedMarketIds = useMemo(() => {
    const set = new Set<string>();
    selectedUser?.markets?.forEach((m) => set.add(m.id));
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

  // ---- Market create / edit ----
  const resetMarketForm = () => {
    setEditingMarketId(null);
    setMName("");
    setMGeo("");
    setMAes("");
  };

  const startEditMarket = (m: AdminMarket) => {
    setEditingMarketId(m.id);
    setMName(m.name || "");
    setMGeo((m as any).geographicDescription || "");
    setMAes((m as any).accountExecutives || "");
  };

  const saveMarket = async () => {
    if (!mName.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: mName.trim(),
        geographicDescription: mGeo.trim() ? mGeo.trim() : null,
        accountExecutives: mAes.trim() ? mAes.trim() : null
      };

      if (editingMarketId) {
        await apiFetch(`/admin/markets/${editingMarketId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/admin/markets", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      await loadAll();
      resetMarketForm();
    } catch (e: any) {
      setError(e?.message || "Failed to save market");
    } finally {
      setBusy(false);
    }
  };

  // ---- User updates ----
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

  // ---- Create user ----
  const toggleMarketForNewUser = (marketId: string) => {
    setUMarketIds((prev) => {
      const set = new Set(prev);
      if (set.has(marketId)) set.delete(marketId);
      else set.add(marketId);
      return Array.from(set);
    });
  };

  const createUser = async () => {
    if (!uEmail.trim()) return;
    if (!uTempPassword || uTempPassword.length < 8) {
      setError("Temp password must be at least 8 characters");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: uEmail.trim(),
          role: uRole,
          nickname: uNickname.trim() ? uNickname.trim() : null,
          tempPassword: uTempPassword,
          marketIds: uMarketIds,
          quotaCalls: uQuotaCalls,
          quotaEmails: uQuotaEmails,
          quotaMeetingsBooked: uQuotaMeetingsBooked,
          quotaCleanOpportunities: uQuotaCleanOpps
        })
      });

      setUEmail("");
      setURole("BASIC");
      setUNickname("");
      setUTempPassword("");
      setUQuotaCalls(0);
      setUQuotaEmails(0);
      setUQuotaMeetingsBooked(0);
      setUQuotaCleanOpps(0);
      setUMarketIds([]);

      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  // ---- Manual sync ----
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
          {/* Manual Sync */}
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

          {/* Markets: create/edit + list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Markets</h2>
              {editingMarketId && (
                <button
                  disabled={busy}
                  onClick={resetMarketForm}
                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <input
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="Market name"
                value={mName}
                onChange={(e) => setMName(e.target.value)}
              />

              <textarea
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="Geographic description (optional)"
                value={mGeo}
                onChange={(e) => setMGeo(e.target.value)}
                rows={2}
              />

              <input
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="Account Executives (comma-separated)"
                value={mAes}
                onChange={(e) => setMAes(e.target.value)}
              />

              <button
                disabled={busy}
                onClick={saveMarket}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
              >
                {editingMarketId ? "Save Market" : "Create Market"}
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {markets.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{m.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {(m as any).geographicDescription
                          ? (m as any).geographicDescription
                          : "No geo description"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        AEs: {(m as any).accountExecutives ? (m as any).accountExecutives : "—"}
                      </div>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => startEditMarket(m)}
                      className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users: create + edit + market assignment */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold">Users</h2>

            {/* Create user */}
            <div className="mt-3 p-3 rounded border border-slate-200 dark:border-slate-700">
              <div className="font-medium text-sm">Create User</div>

              <div className="mt-2 space-y-2">
                <input
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  placeholder="Email"
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                />

                <input
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  placeholder="Nickname (optional)"
                  value={uNickname}
                  onChange={(e) => setUNickname(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as Role)}
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>

                  <input
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    placeholder="Temp password (min 8)"
                    value={uTempPassword}
                    onChange={(e) => setUTempPassword(e.target.value)}
                    type="password"
                  />
                </div>

                <div className="text-xs text-slate-500 mt-1">User quotas</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    type="number"
                    value={uQuotaCalls}
                    onChange={(e) => setUQuotaCalls(Number(e.target.value))}
                    placeholder="Calls quota"
                  />
                  <input
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    type="number"
                    value={uQuotaEmails}
                    onChange={(e) => setUQuotaEmails(Number(e.target.value))}
                    placeholder="Emails quota"
                  />
                  <input
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    type="number"
                    value={uQuotaMeetingsBooked}
                    onChange={(e) => setUQuotaMeetingsBooked(Number(e.target.value))}
                    placeholder="Meetings booked quota"
                  />
                  <input
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    type="number"
                    value={uQuotaCleanOpps}
                    onChange={(e) => setUQuotaCleanOpps(Number(e.target.value))}
                    placeholder="Clean opps quota"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium mb-2">Assign Markets</div>
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {markets.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center justify-between gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <span className="truncate">{m.name}</span>
                        <input
                          type="checkbox"
                          checked={uMarketIds.includes(m.id)}
                          onChange={() => toggleMarketForNewUser(m.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  disabled={busy}
                  onClick={createUser}
                  className="w-full px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
                >
                  {busy ? "Working..." : "Create User"}
                </button>
              </div>
            </div>

            {/* Existing user select */}
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Edit Existing User</div>
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      updateUser(selectedUser.id, {
                        role: selectedUser.role === "ADMIN" ? "BASIC" : "ADMIN"
                      })
                    }
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                  >
                    Toggle Role
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => updateUser(selectedUser.id, { isActive: !selectedUser.isActive })}
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                  >
                    {selectedUser.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium mb-2">Assigned Markets</div>
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
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
