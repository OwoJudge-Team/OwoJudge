"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiFetch } from "@/utils/api";
import { Contest, Standing } from "@/types/contests";
import { formatISOTime } from "@/utils/time";
import { Problem } from "@/types/problems";
import { useParams } from "next/navigation";
import { FaChartPie, FaStar, FaUserGroup } from "react-icons/fa6";
import CoolLink from "@/components/cool-link";
import Loading from "@/components/Loading";
import { isAdmin } from "@/utils/users";
import Toggle from "@/components/Toggle";
import Modal from "@/components/Modal";

export default function ContestPage() {
  const id = useParams().id;

  const [problemScores, setProblemScores] = useState<Map<number, number>>(new Map());
  const [contest, setContest] = useState<Contest | null>(null);
  const [userStanding, setUserStanding] = useState<Standing | null>(null);
  const [rank, setRank] = useState<number>(0);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");

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
            const tmpProblemScores = new Map<number, number>();
            for (const ps of userStand.problemScores) {
              tmpProblemScores.set(ps.serialNumber, ps.score);
            }
            setProblemScores(tmpProblemScores);
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

  const toggleRelease = async () => {
    try {
      const res = await apiFetch(`/api/contests/${id}`, {
        method: "PATCH",
        body: { released: !contest?.released },
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        setContest((prevContest) =>
          prevContest ? { ...prevContest, released: !prevContest.released } : prevContest
        );
        setMessage(`Problem is now ${!contest?.released ? "released" : "unreleased"}.`);
        setIsModalOpen(true);
      } else {
        setMessage(
          `Problem is not ${!contest?.released ? "released" : "unreleased"} successfully.`
        );
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error toggling release status:", error);
    }
  };

  if (!contest) {
    return <Loading message="Loading contest..." />;
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
      <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
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
                AC / Tried
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
                    {p.userDetail.solved} / {p.userDetail.attempted}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin(user) && (
        <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-100">Admin Actions</h2>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-semibold text-slate-200">Toggle Release Status</h3>
              <p className="text-slate-300">
                Toggling the released status of the contest changes the visibility of the contest to
                users.
              </p>
              <div className="flex flex-row items-center gap-2">
                <Toggle enabled={contest.released} onClick={toggleRelease} />
                <p className="text-lg text-slate-200">
                  {contest.released ? "Released" : "Not Released"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        message={message}
      />
    </div>
  );
}
