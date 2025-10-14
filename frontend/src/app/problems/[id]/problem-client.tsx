"use client";
import React, { useState } from "react";

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
    } catch (e: any) {
      setError(e.message || "Error submitting");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Submit</h2>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Language</label>
          <select
            className="rounded border p-2 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <textarea
          className="min-h-[240px] w-full rounded border p-2 font-mono text-sm outline-none focus:ring"
          placeholder="Write your solution here..."
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || source.trim().length === 0}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
          {message && <span className="text-sm text-green-600">{message}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </section>
  );
}
