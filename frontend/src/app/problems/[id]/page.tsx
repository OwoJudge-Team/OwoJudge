"use client";
import React, { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { useParams } from "next/navigation";
import { Problem } from "@/types/problems";
import { FaClock, FaMemory, FaSpinner } from "react-icons/fa6";
import ProblemClient from "./problem-client";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

const SHOW_SUBMIT = false;

export default function ProblemPage() {
  const params = useParams();
  const id = params.id;

  const [data, setData] = useState<Problem | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await apiGet(`/api/problems/${id}`);
        const problemData = await res.json();
        setData(problemData);
      } catch (error) {
        console.error("Failed to fetch problem data:", error);
      }
    };

    fetchProblem();
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
      <div className="mx-auto max-w-5xl">
        {/* Redesigned Header with Card Background */}
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <div className="mb-4 flex items-baseline gap-4">
            <span className="text-3xl font-light text-slate-400">#{data.serialNumber}</span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-100">{data.title}</h1>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <FaClock className="text-indigo-400" />
              <span className="font-medium text-slate-200">{data.timeLimit} ms</span>
              <span className="text-sm">time limit</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-2">
              <FaMemory className="text-purple-400" />
              <span className="font-medium text-slate-200">{data.memoryLimit} KB</span>
              <span className="text-sm">memory limit</span>
            </div>
          </div>
        </div>

        {/* Problem Description with Card Background */}
        {data.description && (
          <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <MarkdownRenderer content={data.description} />
          </section>
        )}

        {/* Submit Section (Controlled by Dev Variable) */}
        {SHOW_SUBMIT && (
          <div className="mt-8">
            <ProblemClient displayID={String(data.serialNumber)} />
          </div>
        )}
      </div>
    </div>
  );
}
