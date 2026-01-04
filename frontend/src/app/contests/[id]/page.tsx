"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/utils/api";
// import contests from "@/constants/contests";
import { Contest, Standing } from "@/types/contests";
import { formatISOTime } from "@/utils/time";
import { Problem } from "@/types/problems";
import { useParams } from "next/navigation";
import {
  FaChartPie,
  FaCircleCheck,
  FaCircleDot,
  FaCircleXmark,
  FaStar,
  FaUserGroup,
} from "react-icons/fa6";
import CoolLink from "@/components/cool-link";

export default function ContestPage() {
  const id = useParams().id;

  const problemScores = new Map<number, number>();
  const [contest, setContest] = useState<Contest | null>(null);
  const [userStanding, setUserStanding] = useState<Standing | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [problems, setProblems] = useState<Problem[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const contestRes = await apiGet(`/api/contests/${id}`);
        const contestData: Contest = await contestRes.json();

        if (!contestData) {
          return;
        }

        const standingRes = await apiGet(`/api/contests/${id}/standings`);
        const standingData: Standing[] = await standingRes.json();

        contestData.standings = standingData;
        setContest(contestData);

        if (user) {
          const userStand = standingData.find((s) => s.username === user.username) || null;
          setUserStanding(userStand);

          problemScores.clear();
          if (userStand) {
            for (const [serialNumber, score] of Object.entries(userStand.problemScores)) {
              problemScores.set(Number(serialNumber), Number(score));
            }
          }

          const userRank = standingData.findIndex((s) => s.username === user.username) + 1 || 0;
          setRank(userRank);
        }

        const problemIDs = new Set(contestData.problems.map((p) => p.serialNumber));
        const problemsRes = await apiGet(`/api/problems`);
        const allProblems: Problem[] = await problemsRes.json();
        const contestProblems = allProblems.filter((p) => problemIDs.has(p.serialNumber));
        setProblems(contestProblems);
      } catch (error) {
        console.error("Failed to fetch contest:", error);
      }
    };

    fetchContest();
  }, [id, user]);

  if (!contest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-slate-300">Loading contest...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-slate-300">Please login to view the contest.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="text-3xl font-bold text-slate-100">{contest.title}</div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-bold text-slate-400">
            Start: {formatISOTime(contest.startTime)}
          </div>
          <div className="text-sm font-bold text-slate-400">
            End: {formatISOTime(contest.endTime)}
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
        <div className="grid grid-cols-5 items-center justify-between justify-items-center px-4 py-6">
          <div className="text-s mb-4 text-slate-400">Score</div>
          <div></div>
          <div className="text-s mb-4 text-slate-400">AC count</div>
          <div></div>
          <div className="text-s mb-4 text-slate-400">Rank</div>

          <div className="rounded-lg p-3 text-5xl font-semibold text-slate-100">
            {userStanding?.totalScore ?? 0}
          </div>
          <div className="text-6xl font-light text-slate-400">/</div>
          <div className="rounded-lg p-3 text-5xl font-semibold text-slate-100">
            {userStanding?.solvedCount ?? 0}
          </div>
          <div className="text-6xl font-light text-slate-400">/</div>
          <div className="rounded-lg p-3 text-5xl font-semibold text-slate-100">{rank}</div>
        </div>
      </div>

      {/* TODO: Refactor the problem table into a shared component */}
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
              <tr
                key={p.serialNumber}
                className="group transition-all duration-150 hover:bg-slate-700/50"
              >
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
                    {p.dailyQuota}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-800/50 px-3 text-sm font-semibold text-amber-200">
                      <FaStar />
                      {problemScores.get(p.serialNumber) ?? 0}
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
                  {p.userDetail.solved ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-green-50 shadow-sm">
                      <FaCircleCheck />
                      Solved
                    </span>
                  ) : p.userDetail.attempted ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-red-50 shadow-sm">
                      <FaCircleXmark />
                      {p.userDetail.attempted} {p.userDetail.attempted === 1 ? "Try" : "Tries"}
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
  );
}
