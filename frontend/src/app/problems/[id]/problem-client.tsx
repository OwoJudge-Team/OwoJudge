"use client";
import React, { useState } from "react";
import {
  FaCode,
  FaFileCode,
  FaPaperPlane,
  FaSpinner,
  FaCircleCheck,
  FaCircleExclamation,
} from "react-icons/fa6";

interface Props {
  displayID: string;
}

const languages = ["gcc c11", "g++ c++14", "g++ c++17", "rust", "pseudo"];

export default function ProblemClient({ displayID }: Props) {
  const [language, setLanguage] = useState("g++ c++17");
  const [source, setSource] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_BACKEND_URL;
  const submitUrl = base
    ? `${base}/api/submissions`
    : `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/submissions`;

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemID: displayID,
          language,
          source,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Submission failed");
      }
      setSource("");
      setMessage("Submitted successfully!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error submitting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
      <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100">
          <FaPaperPlane className="h-5 w-5 text-indigo-400" />
          Submit Solution
        </h2>
      </div>

      <div className="space-y-6 p-6">
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <FaCode className="h-3.5 w-3.5 text-slate-400" />
            Programming Language
          </label>
          <select
            className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-sm text-slate-100 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Code Editor */}
        <div className="space-y-2">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <FaFileCode className="h-3.5 w-3.5 text-slate-400" />
            Source Code
          </label>
          <textarea
            className="min-h-[320px] w-full rounded-lg border border-slate-600 bg-slate-900/50 p-4 font-mono text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="// Write your solution here...&#10;#include <iostream>&#10;using namespace std;&#10;&#10;int main() {&#10;    // Your code&#10;    return 0;&#10;}"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </div>

        {/* Submit Button and Messages */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting || source.trim().length === 0}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 hover:bg-indigo-500 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-indigo-600/30"
          >
            {submitting ? (
              <>
                <FaSpinner className="h-4 w-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <FaPaperPlane className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                <span>Submit Solution</span>
              </>
            )}
          </button>

          {/* Status Messages */}
          {message && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-800/50 px-4 py-3 text-sm font-semibold text-emerald-200">
              <FaCircleCheck className="h-4 w-4" />
              {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-800/50 px-4 py-3 text-sm font-semibold text-rose-200">
              <FaCircleExclamation className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
