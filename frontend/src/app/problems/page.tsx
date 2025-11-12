"use client";

import Link from "next/link";
import { problems } from "@/constants/problems";
import { FaAngleRight, FaChartPie, FaStar, FaUserGroup } from "react-icons/fa6";

const ProblemPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ID
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Problem
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Quota
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Score
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AC Count
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {problems.map((p) => (
                <tr key={p.id} className="group transition-all duration-150 hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-sm font-semibold text-slate-300">
                      {p.id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/problems/${p.id}`}
                      className="group/link inline-flex items-center gap-2 text-base font-semibold text-slate-100 transition-all hover:text-indigo-400"
                    >
                      <span className="transition-transform duration-150 group-hover/link:translate-x-1">
                        {p.title}
                      </span>
                      <FaAngleRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900/40 px-3 py-1.5 text-sm font-medium text-indigo-300">
                      <FaChartPie />
                      {p.quota}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-950/50 px-3 text-sm font-semibold text-amber-400">
                        <FaStar />
                        {p.score}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <FaUserGroup />
                      {p.acNum.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.isAC ? (
                      <span className="inline-flex w-[20ch] items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
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
                      <span className="inline-flex w-[20ch] items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        123 Try
                      </span>
                      // ) : (
                      //   <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                      //     <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      //       <path
                      //         fillRule="evenodd"
                      //         d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                      //         clipRule="evenodd"
                      //       />
                      //     </svg>
                      //     Unsolved
                      //   </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProblemPage;
