"use client";

import Link from "next/link";
import { problems, type Problem } from "@/constants/problems";

const ProblemPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 md:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            Problem Set
          </div>
          <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl dark:from-slate-50 dark:via-slate-200 dark:to-slate-400">
            Problems
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
            Challenge yourself with our curated collection
          </p>
        </div>

        <ProblemsTable items={problems} />
      </div>
    </div>
  );
};
function ProblemsTable({ items }: { items: Problem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              ID
            </th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Problem
            </th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Quota
            </th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Score
            </th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AC Count
              </div>
            </th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {items.map((p, idx) => (
            <tr
              key={p.id}
              className={`group transition-all duration-150 ${
                p.isAC
                  ? "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {p.id}
                </div>
              </td>
              <td className="px-6 py-4">
                <Link
                  href={`/problems/${p.id}`}
                  className="group/link inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition-all hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                >
                  <span className="transition-transform duration-150 group-hover/link:translate-x-1">
                    {p.title}
                  </span>
                  <svg
                    className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {p.quota}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-50 px-3 text-sm font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {p.score}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <svg
                    className="h-4 w-4 text-slate-500 dark:text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  {p.acNum.toLocaleString()}
                </div>
              </td>
              <td className="px-6 py-4">
                {p.isAC ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Solved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Unsolved
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProblemPage;
