"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaUser, FaLock, FaArrowRight, FaCode, FaArrowLeft } from "react-icons/fa6";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic
    console.log("Login attempt:", { username, password });
  };

  return (
    <div className="flex h-max items-center justify-center overflow-x-hidden bg-background px-8">
      <div className="w-full max-w-md pt-32">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 shadow-xl">
            <FaCode className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to your OwoJudge account</p>
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
                  <FaUser className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                  <FaLock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/50 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900/50 text-indigo-600 transition-all duration-150 focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-0"
                />
                <span className="text-sm text-slate-300">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-indigo-400 transition-all duration-150 hover:text-indigo-300"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="group/btn flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-150 hover:bg-indigo-500 hover:shadow-xl"
            >
              <span>Sign In</span>
              <FaArrowRight className="h-4 w-4 transition-transform duration-150 group-hover/btn:translate-x-1" />
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-700"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Or
            </span>
            <div className="h-px flex-1 bg-slate-700"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-indigo-400 transition-all duration-150 hover:text-indigo-300"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 transition-all duration-150 hover:text-slate-300"
          >
            <FaArrowLeft className="mr-1 inline-block h-2.5 w-2.5" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
