// frontend/src/pages/AccountPage.tsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type MeResponse = {
  id: string;
  email: string;
  nickname: string | null;
  role: "ADMIN" | "BASIC";
  isActive: boolean;
  createdAt: string;

  quotaCalls: number;
  quotaEmails: number;
  quotaMeetingsBooked: number;
  quotaCleanOpportunities: number;
};

const AccountPage: React.FC = () => {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const loadMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<MeResponse>("/users/me");
      setMe(res);
      setNickname(res.nickname ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const saveNickname = async () => {
    if (!me) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch<MeResponse>("/users/me", {
        method: "PUT",
        body: JSON.stringify({ nickname: nickname.trim() || null })
      });
      setMe(res);
      setSuccess("Nickname updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to update nickname");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Password updated.");
    } catch (e: any) {
      setError(e?.message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-semibold">Account</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Update your profile and password.
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-slate-200 dark:border-slate-700 text-green-500">
          {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
          Loading...
        </div>
      ) : (
        me && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Profile */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold">Profile</h2>

              <div className="mt-3 text-sm">
                <div className="text-slate-500">Email</div>
                <div className="font-medium">{me.email}</div>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-slate-500">Role</div>
                <div className="font-medium">{me.role}</div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-500 mb-1">Nickname</label>
                <input
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your display name"
                />
              </div>

              <button
                disabled={busy}
                onClick={saveNickname}
                className="mt-3 w-full px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Nickname"}
              </button>
            </div>

            {/* Quotas */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold">My Quotas (Monthly)</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500">Calls</div>
                  <div className="text-2xl font-semibold">{me.quotaCalls.toLocaleString()}</div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500">Emails</div>
                  <div className="text-2xl font-semibold">{me.quotaEmails.toLocaleString()}</div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500">Meetings booked</div>
                  <div className="text-2xl font-semibold">
                    {me.quotaMeetingsBooked.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="text-xs text-slate-500">Clean opportunities</div>
                  <div className="text-2xl font-semibold">
                    {me.quotaCleanOpportunities.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Quotas are set per salesperson (not per market).
              </div>
            </div>

            {/* Password */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold">Change Password</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Current password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-500 mb-1">New password</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                disabled={busy || !currentPassword || !newPassword}
                onClick={changePassword}
                className="mt-3 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"
              >
                {busy ? "Updating..." : "Update Password"}
              </button>

              <div className="mt-2 text-xs text-slate-500">
                MVP does not enforce complexity rules yet.
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default AccountPage;
