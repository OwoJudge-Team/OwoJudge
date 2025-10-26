"use client";
import React from "react";
import ProblemClient from "./problem-client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
// import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
// import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

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
  submissionDetail?: any;
  userDetail?: any;
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

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b-2 border-gray-200 pb-4">
          <h1 className="mb-2 text-4xl font-bold text-foreground">
            {data.id}. {data.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Time Limit: {data.timeLimit} ms</span>
            <span>Memory Limit: {data.memoryLimit} KB</span>
            <span>Score Policy: {data.scorePolicy}</span>
            {data.tags && data.tags.length > 0 && <span>Tags: {data.tags.join(", ")}</span>}
          </div>
        </div>

        {data.description && (
          <section className="mb-8 rounded-lg bg-white p-8 shadow-lg">
            <div className="prose max-w-full">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {data.description}
              </ReactMarkdown>
            </div>
          </section>
        )}

        <ProblemClient displayID={data.id} />
      </div>
    </div>
  );
}
