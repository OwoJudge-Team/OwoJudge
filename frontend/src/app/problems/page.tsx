"use client";

import { Problem } from "@/constants/problems";
import {
  FaChartPie,
  FaCircleCheck,
  FaCircleDot,
  FaCircleXmark,
  FaStar,
  FaUserGroup,
  FaCircleQuestion,
} from "react-icons/fa6";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import CoolLink from "@/components/cool-link";

const ProblemPage: React.FC = () => {

  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await apiGet(`/api/problems`);
        const data = await res.json();
        setProblems(data);
      } catch (error) {
        console.error("Failed to fetch problems:", error);
      }
    };

    fetchProblems();
  }, []);

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
              {/* TODO: Only show this row if user is TA */}
              <tr>
                <td className="px-6 py-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-dashed border-slate-700/60 text-sm font-semibold text-slate-300">
                    +
                  </div>
                </td>
                <td className="px-6 py-4">
                  <CoolLink href={`/create-problem`} text="Create New Problem" />
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-dashed border-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
                    <FaChartPie /> ?
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 items-center gap-1 rounded-lg border-[3px] border-dashed border-amber-800/50 px-3 text-sm font-semibold text-amber-200">
                      <FaStar /> ?
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <FaUserGroup /> ?
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-dashed border-slate-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-200 shadow-sm">
                    <FaCircleQuestion /> ???
                  </span>
                </td>
              </tr>
              {problems.map((p) => (
                <tr key={p.serialNumber} className="group transition-all duration-150 hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-sm font-semibold text-slate-300">
                      {p.serialNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <CoolLink href={`/problems/${p.serialNumber}`} text={p.title} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
                      <FaChartPie />
                      {p.quota ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-800/50 px-3 text-sm font-semibold text-amber-200">
                        <FaStar />
                        {p.fullScore}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                      <FaUserGroup />
                      {p.submissionDetail!.accepted.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.userDetail?.solved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-green-50 shadow-sm">
                        <FaCircleCheck />
                        Solved
                      </span>
                    ) : p.userDetail?.attempted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-50 shadow-sm">
                        <FaCircleXmark />
                        {p.userDetail?.attempted} {p.userDetail?.attempted === 1 ? "Try" : "Tries"}
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
