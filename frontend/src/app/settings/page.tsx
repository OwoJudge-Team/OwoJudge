"use client";

import React, { useEffect, useReducer } from "react";
import { FaUser, FaIdCard, FaKey, FaLock, FaShieldHalved } from "react-icons/fa6";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiFetch } from "@/utils/api";
import { Card, LabeledInput } from "./components";
import { initialState, settingsReducer, SettingsState } from "./settingsReducer";
import Loading from "@/components/Loading";

export default function SettingsPage() {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const {
    username,
    studentId,
    displayName,
    role,
    sshPublicKey,
    currentPassword,
    newPassword,
    confirmPassword,
    loading,
    message,
  } = state;

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const res = await apiGet(`/api/users/${user.username}`);
          if (!res.ok) throw new Error("Failed to fetch user data");
          const userData = await res.json();

          dispatch({
            type: "LOAD_USER",
            payload: {
              username: userData.username || "",
              studentId: userData.studentId || "",
              displayName: userData.displayName || "",
              role: userData.role,
              sshPublicKey: userData.gitPublicKey || "",
            },
          });
        } catch (err) {
          console.error(err);
          dispatch({
            type: "SET_MESSAGE",
            value: { text: "Failed to load user settings.", type: "error" },
          });
          dispatch({ type: "SET_LOADING", value: false });
        }
      };
      fetchUserData();
    }
  }, [user]);

  const handleChange = (field: keyof SettingsState) => (value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: "SET_MESSAGE", value: null });

    if (newPassword && newPassword !== confirmPassword) {
      dispatch({
        type: "SET_MESSAGE",
        value: { text: "New passwords do not match.", type: "error" },
      });
      return;
    }

    if (!user) return;

    const updates: Record<string, string> = { oldPassword: currentPassword };
    if (displayName) updates.displayName = displayName;
    if (newPassword) updates.password = newPassword;
    updates.gitPublicKey = sshPublicKey;

    try {
      const res = await apiFetch(`/api/users/${user.username}`, {
        method: "PATCH",
        body: updates,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        dispatch({
          type: "SET_MESSAGE",
          value: { text: "Settings updated successfully.", type: "success" },
        });
        dispatch({ type: "RESET_PASSWORD_FIELDS" });
      } else {
        let errorMsg = "Update failed";
        try {
          const text = await res.text();
          try {
            const errData = JSON.parse(text);
            errorMsg = Array.isArray(errData)
              ? errData.map((e: { msg: string }) => e.msg).join(", ")
              : errData.message || text;
          } catch {
            errorMsg = text || "Update failed";
          }
        } catch (e) {
          console.error("Error reading response:", e);
        }
        dispatch({ type: "SET_MESSAGE", value: { text: errorMsg, type: "error" } });
      }
    } catch (err) {
      console.error(err);
      dispatch({
        type: "SET_MESSAGE",
        value: { text: "An error occurred while updating settings.", type: "error" },
      });
    }
  };

  if (loading) {
    return <Loading message="Loading settings..." />;
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
          <Card title="User Information">
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                id="username"
                label="Username"
                icon={<FaUser className="h-3.5 w-3.5" />}
                value={username}
                disabled
                title="Username cannot be changed"
              />

              <LabeledInput
                id="studentId"
                label="Student ID"
                icon={<FaIdCard className="h-3.5 w-3.5" />}
                value={studentId}
                disabled
                placeholder="Not set"
                title="Contact admin to change Student ID"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                id="displayName"
                label="Display Name"
                icon={<FaUser className="h-3.5 w-3.5" />}
                value={displayName}
                onChange={handleChange("displayName")}
                placeholder="Enter your display name"
                required
              />

              <LabeledInput
                id="role"
                label="Role"
                icon={<FaShieldHalved className="h-3.5 w-3.5" />}
                value={role}
                disabled
              />
            </div>

            <LabeledInput
              id="sshPublicKey"
              label="SSH Public Key"
              icon={<FaKey className="h-3.5 w-3.5" />}
              value={sshPublicKey}
              onChange={handleChange("sshPublicKey")}
              placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
              rows={4}
            />
          </Card>

          <Card title="Change Password">
            <div className="grid gap-4 md:grid-cols-2">
              <LabeledInput
                id="newPassword"
                label="New Password"
                icon={<FaLock className="h-3.5 w-3.5" />}
                type="password"
                value={newPassword}
                onChange={handleChange("newPassword")}
                placeholder="Enter new password (optional)"
              />

              <LabeledInput
                id="confirmPassword"
                label="Confirm Password"
                icon={<FaLock className="h-3.5 w-3.5" />}
                type="password"
                value={confirmPassword}
                onChange={handleChange("confirmPassword")}
                placeholder="Confirm new password"
              />
            </div>
          </Card>

          <Card title="Save">
            <LabeledInput
              id="currentPassword"
              label="Current Password"
              icon={<FaLock className="h-3.5 w-3.5" />}
              type="password"
              value={currentPassword}
              onChange={handleChange("currentPassword")}
              placeholder="Enter current password to confirm changes"
              required
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-indigo-500"
            >
              Save Changes
            </button>
          </Card>
        </form>
      </div>
    </div>
  );
}
