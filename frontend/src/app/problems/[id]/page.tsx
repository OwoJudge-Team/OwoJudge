import React from "react";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import ProblemClient from "./problem-client";

interface ProblemData {
  _id: string;
  displayID: string;
  title: string;
  timeLimit: number;
  memoryLimit: number;
  scorePolicy: string;
  description?: string;
  sampleTestcases?: { filename: string; point: number; subtask: string }[];
  tags?: string[];
  problemRelatedTags?: string[];
  submissionDetail?: any;
  userDetail?: any;
}

async function fetchProblem(id: string): Promise<ProblemData | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL;
    const url = base ? `${base}/api/problems/${id}` : `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/problems/${id}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchProblem(id);
  if (!data) return <div className="p-6">Problem not found or you must login.</div>;

  return (
    <div className="bg-neutral-light min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <div className="mb-8 border-b-2 border-gray-200 pb-4">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {data.displayID}. {data.title}
          </h1>
          <div className="text-sm text-gray-500 flex flex-wrap gap-4">
            <span>Time Limit: {data.timeLimit} ms</span>
            <span>Memory Limit: {data.memoryLimit} KB</span>
            <span>Score Policy: {data.scorePolicy}</span>
            {data.tags && data.tags.length > 0 && <span>Tags: {data.tags.join(", ")}</span>}
          </div>
        </div>

        {/* Intro Section */}
        {data.description && (
          <section className="bg-white shadow-lg rounded-lg p-8 mb-8">
            <MarkdownRenderer content={data.description} />
          </section>
        )}

        <ProblemClient displayID={data.displayID} />
      </div>
    </div>
  );
}
