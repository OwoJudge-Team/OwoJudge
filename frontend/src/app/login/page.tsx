"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaUser, FaLock } from "react-icons/fa6";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log("Login attempt:", { username, password });
  };

  return (
    <div className="flex items-center justify-center bg-background px-8 py-12">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-100">Welcome Back</h1>
          <p className="mt-2 text-slate-400">Sign in to continue to OwoJudge</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-300">
                Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <FaUser className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <FaLock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 py-3 pl-11 pr-4 text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-slate-700/50"></div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 hover:bg-indigo-500 hover:shadow-indigo-500/40"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
