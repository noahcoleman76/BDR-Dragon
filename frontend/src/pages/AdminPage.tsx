import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { AdminMarket, AdminUser, IntegrationStatus } from "../types/admin";

type Role = "ADMIN" | "BASIC";
type TabKey = "SYSTEMS" | "MARKETS" | "USERS" | "NEW_USER";

const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("SYSTEMS");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Market create/edit ----
  const [mName, setMName] = useState("");
  const [mGeo, setMGeo] = useState("");
  const [mAes, setMAes] = useState("");
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);

  // ---- Users search/selection ----
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId]
  );
  const [filterRole, setFilterRole] = useState<"ALL" | Role>("ALL");
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [filterMarketId, setFilterMarketId] = useState<"ALL" | string>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [editQuotas, setEditQuotas] = useState({
    quotaCalls: 0,
    quotaEmails: 0,
    quotaMeetingsBooked: 0,
    quotaCleanOpportunities: 0
  });
  useEffect(() => {
    if (!selectedUser) return;

    setEditUserMarketIds(selectedUser.markets.map((m) => m.id));

    setEditQuotas({
      quotaCalls: Number((selectedUser as any).quotaCalls ?? 0),
      quotaEmails: Number((selectedUser as any).quotaEmails ?? 0),
      quotaMeetingsBooked: Number((selectedUser as any).quotaMeetingsBooked ?? 0),
      quotaCleanOpportunities: Number((selectedUser as any).quotaCleanOpportunities ?? 0)
    });

    setShowResetSection(false);
    setResetPw("");
    setShowResetPw(false);
  }, [selectedUserId, selectedUser]);

  // local editable market assignments for selected user
  const [editUserMarketIds, setEditUserMarketIds] = useState<string[]>([]);

  // ---- Create user form ----
  const [uEmail, setUEmail] = useState("");
  const [uRole, setURole] = useState<Role>("BASIC");
  const [uFirstName, setUFirstName] = useState("");
  const [uLastName, setULastName] = useState("");

  const [uTempPassword, setUTempPassword] = useState("");
  const [showCreatePw, setShowCreatePw] = useState(false);

  const [uQuotaCalls, setUQuotaCalls] = useState(0);
  const [uQuotaEmails, setUQuotaEmails] = useState(0);
  const [uQuotaMeetingsBooked, setUQuotaMeetingsBooked] = useState(0);
  const [uQuotaCleanOpps, setUQuotaCleanOpps] = useState(0);

  // checkbox market IDs for new user
  const [uMarketIds, setUMarketIds] = useState<string[]>([]);

  // Reset selected user's password (collapsed by default)
  const [resetPw, setResetPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [showResetSection, setShowResetSection] = useState(false);

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

  // keep editUserMarketIds in sync when selected user changes
  useEffect(() => {
    if (!selectedUser) {
      setEditUserMarketIds([]);
      return;
    }
    setEditUserMarketIds(selectedUser.markets.map((m) => m.id));
    setShowResetSection(false);
    setResetPw("");
    setShowResetPw(false);
  }, [selectedUserId, selectedUser]);

  // ---- Markets create/edit ----
  const resetMarketForm = () => {
    setEditingMarketId(null);
    setMName("");
    setMGeo("");
    setMAes("");
  };

  const startEditMarket = (m: AdminMarket) => {
    setTab("MARKETS");
    setEditingMarketId(m.id);
    setMName(m.name || "");
    setMGeo(m.geographicDescription || "");
    setMAes(m.accountExecutives || "");
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

  const deleteMarket = async (marketId: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/markets/${marketId}`, { method: "DELETE" });
      // if we were editing it, reset
      if (editingMarketId === marketId) resetMarketForm();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Failed to delete market");
    } finally {
      setBusy(false);
    }
  };

  // ---- Users ----
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

  const saveUserQuotas = async () => {
    if (!selectedUser) return;

    // basic sanitization
    const payload = {
      quotaCalls: Math.max(0, Number(editQuotas.quotaCalls || 0)),
      quotaEmails: Math.max(0, Number(editQuotas.quotaEmails || 0)),
      quotaMeetingsBooked: Math.max(0, Number(editQuotas.quotaMeetingsBooked || 0)),
      quotaCleanOpportunities: Math.max(0, Number(editQuotas.quotaCleanOpportunities || 0))
    };

    await updateUser(selectedUser.id, payload);
  };

  const saveUserMarkets = async () => {
    if (!selectedUser) return;
    await updateUser(selectedUser.id, { marketIds: editUserMarketIds });
  };

  const createUser = async () => {
    if (!uEmail.trim()) return;
    if (!uFirstName.trim() || !uLastName.trim()) {
      setError("First name and last name are required");
      return;
    }
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
          firstName: uFirstName.trim(),
          lastName: uLastName.trim(),
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
      setUFirstName("");
      setULastName("");
      setUTempPassword("");
      setShowCreatePw(false);
      setUQuotaCalls(0);
      setUQuotaEmails(0);
      setUQuotaMeetingsBooked(0);
      setUQuotaCleanOpps(0);
      setUMarketIds([]);

      await loadAll();
      setTab("USERS");
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  const setUserPassword = async (userId: string) => {
    if (!resetPw || resetPw.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/admin/users/${userId}/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: resetPw })
      });
      setResetPw("");
      setShowResetPw(false);
      setShowResetSection(false);
    } catch (e: any) {
      setError(e?.message || "Failed to set password");
    } finally {
      setBusy(false);
    }
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

  const marketOptions = useMemo(
    () => markets.map((m) => ({ value: m.id, label: m.name })),
    [markets]
  );

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();

    const base = users.filter((u) => {
      // text search
      if (q) {
        const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim().toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        if (!email.includes(q) && !fullName.includes(q)) return false;
      }

      // role filter
      if (filterRole !== "ALL" && u.role !== filterRole) return false;

      // active filter
      if (filterActive === "ACTIVE" && !u.isActive) return false;
      if (filterActive === "INACTIVE" && u.isActive) return false;

      // market filter
      if (filterMarketId !== "ALL") {
        const hasMarket = (u.markets ?? []).some((m) => m.id === filterMarketId);
        if (!hasMarket) return false;
      }

      return true;
    });

    // keep UX sane
    return base.slice(0, 50);
  }, [users, userQuery, filterRole, filterActive, filterMarketId]);

  const MarketCheckboxList = ({
    selectedIds,
    onChange
  }: {
    selectedIds: string[];
    onChange: (next: string[]) => void;
  }) => {
    const toggle = (id: string) => {
      if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
      else onChange([...selectedIds, id]);
    };

    return (
      <div className="space-y-2">
        {marketOptions.length === 0 ? (
          <div className="text-sm text-slate-500">No markets yet.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {marketOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 p-2 rounded border border-slate-200 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k;
    return (
      <button
        type="button"
        onClick={() => setTab(k)}
        className={[
          "px-3 py-2 rounded-lg text-sm border",
          "border-slate-200 dark:border-slate-700",
          active
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200",
          "disabled:opacity-50"
        ].join(" ")}
        disabled={busy}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-semibold">Admin</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Manage users, markets, and manual sync.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabButton k="SYSTEMS" label="Systems (manual sync)" />
          <TabButton k="MARKETS" label="Markets" />
          <TabButton k="USERS" label="Users" />
          <TabButton k="NEW_USER" label="New User" />
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
        <div className="space-y-4">
          {/* SYSTEMS */}
          {tab === "SYSTEMS" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold">Systems</h2>
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
                className="mt-3 w-full sm:w-auto px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
              >
                {busy ? "Working..." : "Run Sync (stub)"}
              </button>
            </div>
          )}

          {/* MARKETS */}
          {tab === "MARKETS" && (
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

              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    Market name
                    <input
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                    />
                  </label>

                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    Geographic description (optional)
                    <textarea
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={mGeo}
                      onChange={(e) => setMGeo(e.target.value)}
                      rows={2}
                    />
                  </label>

                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    Account Executives (comma-separated)
                    <input
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={mAes}
                      onChange={(e) => setMAes(e.target.value)}
                    />
                  </label>

                  <button
                    disabled={busy}
                    onClick={saveMarket}
                    className="w-full sm:w-auto px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                  >
                    {editingMarketId ? "Save Market" : "Create Market"}
                  </button>
                </div>

                <div className="space-y-2">
                  {markets.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{m.name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {m.geographicDescription || "No geo description"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            AEs: {m.accountExecutives || "—"}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            disabled={busy}
                            onClick={() => startEditMarket(m)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => {
                              const ok = window.confirm(
                                `Delete market "${m.name}"?\n\nThis may affect users assigned to it.`
                              );
                              if (ok) deleteMarket(m.id);
                            }}
                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 dark:border-red-700 dark:text-red-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === "USERS" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Users</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Showing {filteredUsers.length} user{filteredUsers.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm"
                    disabled={busy}
                  >
                    {showFilters ? "Hide filters" : "Filter"}
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm"
                    onClick={() => {
                      setUserQuery("");
                      setFilterRole("ALL");
                      setFilterActive("ALL");
                      setFilterMarketId("ALL");
                    }}
                    disabled={busy}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search row */}
              <div className="mt-3">
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  Search (email or name)
                  <input
                    className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="e.g. jane@company.com or Jane Doe"
                  />
                </label>
              </div>

              {/* Filters (collapsible) */}
              {showFilters && (
                <div className="mt-3 p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Role
                      <select
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as any)}
                      >
                        <option value="ALL">All</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="BASIC">BASIC</option>
                      </select>
                    </label>

                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Status
                      <select
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                        value={filterActive}
                        onChange={(e) => setFilterActive(e.target.value as any)}
                      >
                        <option value="ALL">All</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </label>

                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Market
                      <select
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                        value={filterMarketId}
                        onChange={(e) => setFilterMarketId(e.target.value as any)}
                      >
                        <option value="ALL">All</option>
                        {marketOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* Main layout */}
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {/* Left: user list */}
                <div className="rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <div className="text-xs text-slate-600 dark:text-slate-300">Results</div>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500">No matches.</div>
                  ) : (
                    <div className="max-h-[520px] overflow-auto">
                      {filteredUsers.map((u) => {
                        const isSelected = u.id === selectedUserId;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => setSelectedUserId(u.id)}
                            className={[
                              "w-full text-left px-3 py-3 border-b last:border-b-0",
                              "border-slate-200 dark:border-slate-700",
                              isSelected
                                ? "bg-slate-100 dark:bg-slate-700"
                                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {u.firstName} {u.lastName}
                                </div>
                                <div className="text-xs text-slate-500 truncate">{u.email}</div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={[
                                    "text-[11px] px-2 py-0.5 rounded border",
                                    u.role === "ADMIN"
                                      ? "border-slate-400 dark:border-slate-500"
                                      : "border-slate-200 dark:border-slate-600"
                                  ].join(" ")}
                                >
                                  {u.role}
                                </span>
                                <span
                                  className={[
                                    "text-[11px] px-2 py-0.5 rounded border",
                                    u.isActive
                                      ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                                      : "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300"
                                  ].join(" ")}
                                >
                                  {u.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right: selected user */}
                <div className="rounded border border-slate-200 dark:border-slate-700 p-4">
                  {!selectedUser ? (
                    <div className="text-sm text-slate-500">Select a user to edit.</div>
                  ) : (
                    <div className="space-y-4">
                      {/* User header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold truncate">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{selectedUser.email}</div>

                          {/* Markets as chips */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedUser.markets.length ? (
                              selectedUser.markets.map((m) => (
                                <span
                                  key={m.id}
                                  className="text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                                >
                                  {m.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">No markets assigned</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                            {selectedUser.role}
                          </span>
                          <span
                            className={[
                              "text-[11px] px-2 py-0.5 rounded border",
                              selectedUser.isActive
                                ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                                : "border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300"
                            ].join(" ")}
                          >
                            {selectedUser.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
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
                          Toggle role
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => updateUser(selectedUser.id, { isActive: !selectedUser.isActive })}
                          className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
                        >
                          {selectedUser.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">Monthly Quotas</div>
                          <button
                            disabled={busy}
                            onClick={saveUserQuotas}
                            className="px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
                          >
                            {busy ? "Saving..." : "Save"}
                          </button>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="text-xs text-slate-600 dark:text-slate-300">
                            Calls
                            <input
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                              type="number"
                              min={0}
                              value={editQuotas.quotaCalls}
                              onChange={(e) => setEditQuotas((q) => ({ ...q, quotaCalls: Number(e.target.value) }))}
                            />
                          </label>

                          <label className="text-xs text-slate-600 dark:text-slate-300">
                            Emails
                            <input
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                              type="number"
                              min={0}
                              value={editQuotas.quotaEmails}
                              onChange={(e) => setEditQuotas((q) => ({ ...q, quotaEmails: Number(e.target.value) }))}
                            />
                          </label>

                          <label className="text-xs text-slate-600 dark:text-slate-300">
                            Meetings booked
                            <input
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                              type="number"
                              min={0}
                              value={editQuotas.quotaMeetingsBooked}
                              onChange={(e) =>
                                setEditQuotas((q) => ({ ...q, quotaMeetingsBooked: Number(e.target.value) }))
                              }
                            />
                          </label>

                          <label className="text-xs text-slate-600 dark:text-slate-300">
                            Clean opps
                            <input
                              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                              type="number"
                              min={0}
                              value={editQuotas.quotaCleanOpportunities}
                              onChange={(e) =>
                                setEditQuotas((q) => ({ ...q, quotaCleanOpportunities: Number(e.target.value) }))
                              }
                            />
                          </label>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Quotas apply to the user’s reporting targets.
                        </div>
                      </div>

                      {/* Market assignment */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">Assigned Markets</div>
                          <button
                            disabled={busy}
                            onClick={saveUserMarkets}
                            className="px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
                          >
                            {busy ? "Saving..." : "Save"}
                          </button>
                        </div>

                        <div className="mt-2">
                          <MarketCheckboxList selectedIds={editUserMarketIds} onChange={setEditUserMarketIds} />
                        </div>
                      </div>

                      {/* Reset password (collapsed) */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">Password</div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setShowResetSection((v) => !v)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-50"
                          >
                            {showResetSection ? "Hide" : "Reset password"}
                          </button>
                        </div>

                        {showResetSection && (
                          <div className="mt-2 space-y-2">
                            <label className="text-xs text-slate-600 dark:text-slate-300">
                              New password (min 8)
                              <input
                                className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                                value={resetPw}
                                onChange={(e) => setResetPw(e.target.value)}
                                type={showResetPw ? "text" : "password"}
                              />
                            </label>

                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={showResetPw}
                                onChange={(e) => setShowResetPw(e.target.checked)}
                              />
                              Show password
                            </label>

                            <button
                              disabled={busy}
                              onClick={() => setUserPassword(selectedUser.id)}
                              className="w-full sm:w-auto px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
                            >
                              Set password
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* NEW USER */}
          {tab === "NEW_USER" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold">New User</h2>

              <div className="mt-3 space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  Email
                  <input
                    className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    First name
                    <input
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={uFirstName}
                      onChange={(e) => setUFirstName(e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    Last name
                    <input
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={uLastName}
                      onChange={(e) => setULastName(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-600 dark:text-slate-300">
                    Role
                    <select
                      className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                      value={uRole}
                      onChange={(e) => setURole(e.target.value as Role)}
                    >
                      <option value="BASIC">BASIC</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Temp password (min 8)
                      <input
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                        value={uTempPassword}
                        onChange={(e) => setUTempPassword(e.target.value)}
                        type={showCreatePw ? "text" : "password"}
                      />
                    </label>
                    <label className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={showCreatePw}
                        onChange={(e) => setShowCreatePw(e.target.checked)}
                      />
                      Show password
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-sm font-medium mb-2">User Quotas</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Calls quota
                      <input
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                        type="number"
                        value={uQuotaCalls}
                        onChange={(e) => setUQuotaCalls(Number(e.target.value))}
                      />
                    </label>

                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Emails quota
                      <input
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                        type="number"
                        value={uQuotaEmails}
                        onChange={(e) => setUQuotaEmails(Number(e.target.value))}
                      />
                    </label>

                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Meetings booked quota
                      <input
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                        type="number"
                        value={uQuotaMeetingsBooked}
                        onChange={(e) => setUQuotaMeetingsBooked(Number(e.target.value))}
                      />
                    </label>

                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      Clean opps quota
                      <input
                        className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                        type="number"
                        value={uQuotaCleanOpps}
                        onChange={(e) => setUQuotaCleanOpps(Number(e.target.value))}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-medium mb-2">Assign Markets</div>
                  <MarketCheckboxList selectedIds={uMarketIds} onChange={setUMarketIds} />
                </div>

                <button
                  disabled={busy}
                  onClick={createUser}
                  className="w-full sm:w-auto px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
                >
                  {busy ? "Working..." : "Create User"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
