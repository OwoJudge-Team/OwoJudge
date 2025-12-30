"use client";

import React, { useState } from "react";
import { FaUser, FaIdCard, FaEnvelope, FaKey, FaLock, FaShieldHalved } from "react-icons/fa6";

export default function SettingsPage() {
  // User info state
  const [handle, setHandle] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [role] = useState("user");
  const [email, setEmail] = useState("");
  const [sshPublicKey, setSshPublicKey] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement update logic
    console.log("Update user:", {
      handle,
      studentId,
      name,
      role,
      email,
      sshPublicKey,
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage your account information and settings
          </p>
        </div>

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
                    onChange={(e) => setHandle(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter your handle"
                    required
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
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter your student ID"
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
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Enter your name"
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

              {/* Email */}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Enter your email"
                  required
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
                    placeholder="Enter new password"
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
              {/* Current Password */}
              <div>
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
                  required
                />
              </div>

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
