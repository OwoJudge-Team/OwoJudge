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
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"}/api/problems/${id}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProblemPage({ params }: { params: { id: string } }) {
  const data = await fetchProblem(params.id);
  if (!data) {
    return <div className="p-6">Problem not found or you must login.</div>;
  }
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {data.displayID}. {data.title}
        </h1>
        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-4">
          <span>Time Limit: {data.timeLimit} ms</span>
          <span>Memory Limit: {data.memoryLimit} KB</span>
          <span>Score Policy: {data.scorePolicy}</span>
          {data.tags && data.tags.length > 0 && <span>Tags: {data.tags.join(", ")}</span>}
        </div>
      </div>
      {data.description && (
        <section>
          <MarkdownRenderer content={data.description} />
        </section>
      )}
      {data.sampleTestcases && data.sampleTestcases.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Sample Testcases</h2>
          <div className="space-y-3">
            {data.sampleTestcases.map((t, i) => (
              <div key={i} className="border rounded p-3 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">{t.subtask}</div>
                <div className="font-mono text-sm">{t.filename}</div>
                <div className="text-xs text-gray-500">Point: {t.point}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <ProblemClient displayID={data.displayID} />
    </div>
  );
}
