"use client";

import React, { useState, useEffect } from "react";
import { FaUser, FaIdCard, FaEnvelope, FaKey, FaLock, FaShieldHalved } from "react-icons/fa6";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiFetch } from "@/utils/api";

export default function SettingsPage() {
  const { user } = useAuth();

  // User info state
  const [handle, setHandle] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [sshPublicKey, setSshPublicKey] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const res = await apiGet(`/api/users/${user.username}`);
          if (!res.ok) throw new Error("Failed to fetch user data");
          const userData = await res.json();

          setHandle(userData.username || "");
          setStudentId(userData.studentId || "");
          setName(userData.displayName || "");
          setRole(userData.isAdmin ? "admin" : "user");
          // Email is usually not in public profile, check if backend returns it for owner
          setEmail(userData.email || "");
          setSshPublicKey(userData.gitPublicKey || "");
          setLoading(false);
        } catch (err) {
          console.error(err);
          setMessage({ text: "Failed to load user settings.", type: "error" });
          setLoading(false);
        }
      };
      fetchUserData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (!user) return;

    const updates: Record<string, string> = {};
    if (name) updates.displayName = name;
    // Backend restricts username updates usually, but if allowed:
    // if (handle !== user.username) updates.username = handle;

    // Only send if not empty
    if (newPassword) updates.password = newPassword;
    if (sshPublicKey) updates.gitPublicKey = sshPublicKey;
    // Note: studentId, email updates might depend on backend permission/schema

    // Check backend routes/users.ts: updateUser supports password, displayName, gitPublicKey (mapped from sshPublicKey)

    try {
      const res = await apiFetch(`/api/users/${user.username}`, {
        method: "PATCH",
        body: updates,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        setMessage({ text: "Settings updated successfully.", type: "success" });
        // Clear password fields
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errData = await res.json();
        // Backend might send array of errors or string
        const errorMsg = Array.isArray(errData)
          ? errData.map((e) => e.msg).join(", ")
          : errData.message || "Update failed";
        setMessage({ text: errorMsg, type: "error" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "An error occurred while updating settings.", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-slate-300">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-lg p-4 text-sm font-medium ${message.type === "success" ? "border border-emerald-800 bg-emerald-900/50 text-emerald-200" : "border border-rose-800 bg-rose-900/50 text-rose-200"}`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Information Card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
            <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-100">User Information</h2>
            </div>
            <div className="space-y-5 p-6">
              {/* Handle and Student ID Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="handle"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaUser className="h-3.5 w-3.5 text-slate-400" />
                    Handle
                  </label>
                  <input
                    type="text"
                    id="handle"
                    value={handle}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/30 px-4 py-2.5 text-sm text-slate-400 focus:outline-none"
                    title="Username cannot be changed"
                  />
                </div>

                <div>
                  <label
                    htmlFor="studentId"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaIdCard className="h-3.5 w-3.5 text-slate-400" />
                    Student ID
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    value={studentId}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/30 px-4 py-2.5 text-sm text-slate-400 focus:outline-none"
                    placeholder="Not set"
                    title="Contact admin to change Student ID"
                  />
                </div>
              </div>

              {/* Name and Role Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaUser className="h-3.5 w-3.5 text-slate-400" />
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter your display name"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="role"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaShieldHalved className="h-3.5 w-3.5 text-slate-400" />
                    Role
                  </label>
                  <div className="w-full rounded-lg border border-slate-600 bg-slate-900/30 px-4 py-2.5 text-sm capitalize text-slate-400">
                    {role}
                  </div>
                </div>
              </div>

              {/* Email - Read Only as per schema usually or separate flow */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                >
                  <FaEnvelope className="h-3.5 w-3.5 text-slate-400" />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/30 px-4 py-2.5 text-sm text-slate-400 focus:outline-none"
                  placeholder="Not available"
                />
              </div>

              {/* SSH Public Key */}
              <div>
                <label
                  htmlFor="sshPublicKey"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                >
                  <FaKey className="h-3.5 w-3.5 text-slate-400" />
                  SSH Public Key
                </label>
                <textarea
                  id="sshPublicKey"
                  value={sshPublicKey}
                  onChange={(e) => setSshPublicKey(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
                />
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
            <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-100">Change Password</h2>
            </div>
            <div className="space-y-5 p-6">
              {/* New Password and Confirm Password Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaLock className="h-3.5 w-3.5 text-slate-400" />
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter new password (optional)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                  >
                    <FaLock className="h-3.5 w-3.5 text-slate-400" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
            <div className="space-y-5 p-6">
              {/* Current Password - Note: Backend doesn't explicitly require current password for self-update, but good practice. However, frontend shouldn't block if not implemented. Removed 'required' for now as backend doesn't validate it in updateUser logic provided. */}
              {/* <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
                >
                  <FaLock className="h-3.5 w-3.5 text-slate-400" />
                  Current Password
                  <span className="ml-auto text-xs text-rose-400">
                    * Required to submit changes
                  </span>
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Enter current password to confirm changes"
                />
              </div> */}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
