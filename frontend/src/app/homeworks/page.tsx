"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatISOTime, compareToCurrentTime, TIME_TO_COLOR } from "@/utils/time";
import { FaClock } from "react-icons/fa";
import CoolLink from "@/components/CoolLink";
import { isAdminOrTA } from "@/utils/users";
import { Contest } from "@/types/contests";

const ContestPage: React.FC = () => {
  const [contests, setContests] = useState<Array<Contest>>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await apiGet("/api/contests");
        const data = await res.json();
        setContests(data);
      } catch (error) {
        console.error("Failed to fetch contests:", error);
      }
    };

    fetchContests();
  }, []);

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="no-scrollbar overflow-x-auto rounded-lg border-slate-700 bg-slate-800 shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-primary-light text-slate-400">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Name
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Start Time
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  End Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isAdminOrTA(user) && (
                <tr className="transition hover:bg-neutral">
                  <td className="px-6 py-4">
                    <CoolLink href="/homeworks/create" text="Create New Homework" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex max-w-60 items-center justify-start gap-3 text-nowrap rounded-xl border-[3px] border-dashed border-slate-600/50 px-3 py-1">
                      <FaClock />
                      ????-??-?? ??:??
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex max-w-60 items-center justify-start gap-3 text-nowrap rounded-xl border-[3px] border-dashed border-slate-600/50 px-3 py-1`}
                    >
                      <FaClock />
                      ????-??-?? ??:??
                    </div>
                  </td>
                </tr>
              )}
              {contests.map((contest) => (
                <tr key={contest._id} className="transition hover:bg-neutral">
                  <td className="px-6 py-4">
                    <CoolLink href={`/homeworks/${contest._id}`} text={contest.title} />
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center justify-start gap-3 rounded-xl bg-${TIME_TO_COLOR[compareToCurrentTime(contest.startTime, contest.endTime, contest.submissionEndTime)]} max-w-60 px-3 py-1`}
                    >
                      <FaClock />
                      {formatISOTime(contest.startTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center justify-start gap-3 rounded-xl bg-${TIME_TO_COLOR[compareToCurrentTime(contest.startTime, contest.endTime, contest.submissionEndTime)]} max-w-60 px-3 py-1`}
                    >
                      <FaClock />
                      {contest.endTime
                        ? formatISOTime(contest.endTime)
                        : formatISOTime(contest.submissionEndTime)}
                    </div>
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

export default ContestPage;
