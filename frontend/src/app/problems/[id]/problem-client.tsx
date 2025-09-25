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

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${backend}/api/submissions`, {
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
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Language</label>
          <select className="border rounded p-2 text-sm" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <textarea
          className="border rounded p-2 font-mono text-sm min-h-[240px] outline-none focus:ring w-full"
          placeholder="Write your solution here..."
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || source.trim().length === 0}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
          {message && <span className="text-green-600 text-sm">{message}</span>}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>
    </section>
  );
}
