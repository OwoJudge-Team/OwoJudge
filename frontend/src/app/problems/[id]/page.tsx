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
import { nord } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Components } from "react-markdown";

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">Loading problem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="mb-6 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-100">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                Problem {data.id}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{data.title}</h1>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            <div className="group rounded-xl border-2 border-blue-100 bg-blue-50/50 p-4 transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5 group-hover:bg-blue-200">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Time Limit
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {data.timeLimit} <span className="text-sm text-gray-600">ms</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="group rounded-xl border-2 border-purple-100 bg-purple-50/50 p-4 transition-all hover:border-purple-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2.5 group-hover:bg-purple-200">
                  <svg
                    className="h-5 w-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Memory Limit
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {data.memoryLimit} <span className="text-sm text-gray-600">KB</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="group rounded-xl border-2 border-green-100 bg-green-50/50 p-4 transition-all hover:border-green-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2.5 group-hover:bg-green-200">
                  <svg
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Score Policy
                  </p>
                  <p className="text-xl font-bold capitalize text-gray-900">{data.scorePolicy}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          {data.tags && data.tags.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {data.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200/50"
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
          <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-100">
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Problem Statement
              </h2>
            </div>
            <div className="prose prose-lg max-w-none p-8">
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
                        style={nord as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ backgroundColor: "transparent", padding: 0, margin: 0 }}
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
