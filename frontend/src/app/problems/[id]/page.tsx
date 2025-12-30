"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaClock, FaMemory, FaTrophy, FaTag, FaSpinner } from "react-icons/fa6";
import ProblemClient from "./problem-client";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

interface ProblemData {
  _id: string;
  id: string;
  title: string;
  timeLimit: number;
  memoryLimit: number;
  scorePolicy: string;
  description?: string;
  sampleTestcases?: { filename: string; point: number; subtask: string }[];
  tags?: string[];
  problemRelatedTags?: string[];
  submissionDetail?: unknown;
  userDetail?: unknown;
}

export default function ProblemPage() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<ProblemData | null>(null);

  useEffect(() => {
    fetch(`/api/problems/${id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <FaSpinner className="mb-4 inline-block h-12 w-12 animate-spin text-indigo-500" />
          <p className="text-lg text-slate-300">Loading problem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Compact Header */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-sm font-semibold text-slate-300">
              {data.id}
            </div>
            <h1 className="text-2xl font-bold text-slate-100">{data.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time Limit */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
              <FaClock className="h-3.5 w-3.5" />
              {data.timeLimit}ms
            </span>

            {/* Memory Limit */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-800/50 px-3 py-1.5 text-sm font-medium text-purple-200">
              <FaMemory className="h-3.5 w-3.5" />
              {data.memoryLimit}KB
            </span>

            {/* Score Policy */}
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800/50 px-3 py-1.5 text-sm font-medium text-amber-200">
              <FaTrophy className="h-3.5 w-3.5" />
              {data.scorePolicy}
            </span>

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <FaTag className="h-3.5 w-3.5 text-slate-400" />
                {data.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="rounded-lg bg-indigo-800/50 px-2.5 py-1 text-xs font-semibold text-indigo-200"
                  >
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Problem Description */}
        {data.description && (
          <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <MarkdownRenderer content={data.description} />
          </section>
        )}

        {/* Submit Section */}
        <ProblemClient displayID={data.id} />
      </div>
    </div>
  );
}
