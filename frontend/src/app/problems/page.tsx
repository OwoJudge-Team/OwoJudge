"use client";

import Link from "next/link";
import { problems } from "@/constants/problems";
import {
  FaAngleRight,
  FaChartPie,
  FaCircleCheck,
  FaCircleDot,
  FaCircleXmark,
  FaStar,
  FaUserGroup,
} from "react-icons/fa6";

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
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
                      <FaChartPie />
                      {p.quota}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-800/50 px-3 text-sm font-semibold text-amber-200">
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
                    {p.status === "correct" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-green-50 shadow-sm">
                        <FaCircleCheck />
                        Solved
                      </span>
                    ) : p.status === "wrong" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-50 shadow-sm">
                        <FaCircleXmark />
                        {p.tryCount} {p.tryCount === 1 ? "Try" : "Tries"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-200 shadow-sm">
                        <FaCircleDot />
                        Unseen
                      </span>
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
