"use client";
import React from "react";
import ProblemClient from "./problem-client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Components } from "react-markdown";
import {
  FaClock,
  FaMemory,
  FaTrophy,
  FaTag,
  FaFileLines,
  FaSpinner,
} from "react-icons/fa6";

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
        {/* Header Section */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <div className="border-b border-slate-700 bg-slate-800/50 px-8 py-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex items-center rounded-lg bg-slate-700/60 px-4 py-1.5 text-sm font-semibold text-slate-300">
                Problem {data.id}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-100">{data.title}</h1>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-4 p-6">
            <div className="group rounded-lg border border-slate-700 bg-slate-700/30 p-4 transition-all duration-150 hover:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-800/50 transition-all duration-150 group-hover:bg-blue-800/70">
                  <FaClock className="h-5 w-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Time Limit
                  </p>
                  <p className="text-xl font-bold text-slate-100">
                    {data.timeLimit} <span className="text-sm font-medium text-slate-400">ms</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="group rounded-lg border border-slate-700 bg-slate-700/30 p-4 transition-all duration-150 hover:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-800/50 transition-all duration-150 group-hover:bg-purple-800/70">
                  <FaMemory className="h-5 w-5 text-purple-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Memory Limit
                  </p>
                  <p className="text-xl font-bold text-slate-100">
                    {data.memoryLimit} <span className="text-sm font-medium text-slate-400">KB</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="group rounded-lg border border-slate-700 bg-slate-700/30 p-4 transition-all duration-150 hover:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-800/50 transition-all duration-150 group-hover:bg-amber-800/70">
                  <FaTrophy className="h-5 w-5 text-amber-200" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Score Policy
                  </p>
                  <p className="text-xl font-bold capitalize text-slate-100">{data.scorePolicy}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          {data.tags && data.tags.length > 0 && (
            <div className="border-t border-slate-700/50 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <FaTag className="h-3.5 w-3.5 text-slate-400" />
                {data.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-lg bg-indigo-800/50 px-3 py-1.5 text-xs font-semibold text-indigo-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Problem Description */}
        {data.description && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
            <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-100">
                <FaFileLines className="h-5 w-5 text-indigo-400" />
                Problem Statement
              </h2>
            </div>
            <div className="prose prose-invert prose-slate max-w-none p-8 prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-200 prose-code:text-indigo-300 prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-700">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !match ? (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        {...props}
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          backgroundColor: "rgb(15 23 42 / 0.5)",
                          padding: "1rem",
                          margin: 0,
                          borderRadius: "0.5rem",
                          border: "1px solid rgb(51 65 85)",
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {data.description}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Submit Section */}
        <ProblemClient displayID={data.id} />
      </div>
    </div>
  );
}
