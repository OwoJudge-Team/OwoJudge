"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiFetch, apiDelete } from "@/utils/api";
import { Contest, Standing } from "@/types/contests";
import { Problem } from "@/types/problems";
import { useParams, useRouter } from "next/navigation";
import ProblemTable from "@/components/ProblemTable";
import Loading from "@/components/Loading";
import { isAdmin, isAdminOrTA } from "@/utils/users";
import Toggle from "@/components/Toggle";
import Modal from "@/components/Modal";
import CumulativeModal from "@/app/homeworks/components/CulmulativeModal";
import LiveTimeline from "@/app/homeworks/components/Timeline";
import StatsButton from "@/components/StatsButton";

export default function ContestPage() {
  const id = useParams().id;

  const [contest, setContest] = useState<Contest | null>(null);
  const [userStanding, setUserStanding] = useState<Standing | null>(null);
  const [totalScoreList, setTotalScoreList] = useState<number[]>([]);
  const [isCululativeModalOpen, setIsCumulativeModalOpen] = useState(false);
  const [rank, setRank] = useState<number>(0);
  const [problems, setProblems] = useState<Problem[]>([]);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [finished, setFinished] = useState(false);

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
        setTotalScoreList(standingData.map((s) => s.totalScore));
        setContest(contestData);
        const problemIDs = new Set(contestData.problems.map((p) => p.serialNumber));
        const problemsRes = await apiGet(`/api/problems`);
        const allProblems: Problem[] = await problemsRes.json();
        const contestProblems = allProblems.filter((p) => problemIDs.has(p.serialNumber));

        if (user) {
          const userStand = standingData.find((s) => s.username === user.username) || null;
          setUserStanding(userStand);
          if (userStand) {
            const tmpProblemScores = new Map<number, number>();
            for (const ps of userStand.problemScores) {
              tmpProblemScores.set(ps.serialNumber, ps.score);
            }
            // Replace the fullscore in problems with the score the user got in the contest
            contestProblems.forEach((p) => {
              if (tmpProblemScores.has(p.serialNumber)) {
                p.fullScore = tmpProblemScores.get(p.serialNumber)!;
              } else {
                p.fullScore = 0;
              }
            });
          } else {
            // If user has no standing, set all problem scores to 0
            contestProblems.forEach((p) => {
              p.fullScore = 0;
            });
          }

          const userRank = standingData.findIndex((s) => s.username === user.username) + 1 || 0;
          setRank(userRank);
        }
        setProblems(contestProblems);
        setMessage(
          `Are you sure you want to delete homework ${contestData.title}? This action cannot be undone.`
        );
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
        setMessage(`Homework is now ${!contest?.released ? "released" : "unreleased"}.`);
        setFinished(true);
        setIsModalOpen(true);
      } else {
        setMessage(
          `Homework is not ${!contest?.released ? "released" : "unreleased"} successfully.`
        );
        setFinished(true);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error toggling release status:", error);
    }
  };

  // add a first header row describing each column
  const downloadCSV = (
    standings: Standing[],
    problems: Problem[],
    filename = "exported_scores.csv"
  ) => {
    // build header row: username, totalScore, then one set of columns per problem
    const header: (string | number)[] = ["username", "totalScore"];
    problems.forEach((p) => {
      header.push(`p${p.serialNumber}_score`, `p${p.serialNumber}_lastSubmissionTime`);
    });

    const data: (string | number)[][] = standings.map((s) => {
      const map = new Map<number, Standing["problemScores"][0]>(
        s.problemScores.map((ps) => [ps.serialNumber, ps])
      );
      const row: (string | number)[] = [s.username, s.totalScore];
      problems.forEach((p) => {
        const ps = map.get(p.serialNumber);
        if (ps) {
          row.push(ps.score, ps.lastSubmissionTime);
        } else {
          row.push(0, "");
        }
      });
      return row;
    });

    data.unshift(header);

    const csvContent = data
      .map((row) =>
        row
          .map((cell) => {
            const stringValue = String(cell).replace(/"/g, '""');
            return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/contests/${id}`);
      if (res.ok) {
        setMessage("Homework deleted successfully. Back to homeworks list.");
        setSuccess(true);
      } else {
        setMessage("Failed to delete the homework.");
      }
    } catch (error) {
      setMessage("An error occurred while deleting the homework.");
      console.error("Error deleting homework:", error);
    } finally {
      setIsDeleting(false);
      setFinished(true);
    }
  };

  if (!contest) {
    return <Loading message="Loading contest..." />;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="text-3xl font-bold text-slate-100">{contest.title}</div>

        <StatsButton size="lg" onClick={() => setIsCumulativeModalOpen(true)} />
      </div>

      <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
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

      <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 px-4 py-6 shadow-sm">
        <p className="px-2 text-xl font-bold text-slate-300">Homework Timeline</p>
        <LiveTimeline
          startTimeISO={contest.startTime}
          midTimeISO={contest.endTime}
          endTimeISO={contest.submissionEndTime}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
        <ProblemTable
          showCreateProblem={false}
          problems={problems}
          solvedProblems={user?.solvedProblems ?? []}
        />
      </div>

      {isAdminOrTA(user) && (
        <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-slate-100">Privileged Actions</h2>
          <div className="flex flex-col gap-8">
            {isAdminOrTA(user) && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold text-slate-200">Update Homework</h3>
                <p className="text-slate-300">Re-fill the homework form to update the homework.</p>
                <button
                  className="w-fit rounded-lg bg-indigo-600 p-2 hover:bg-indigo-700"
                  onClick={() => router.push(`/homeworks/update/${id}`)}
                >
                  Update Homework
                </button>
              </div>
            )}
            {isAdmin(user) && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold text-slate-200">Download Scores</h3>
                <p className="text-slate-300">
                  Download the score of every participant in CSV format. The CSV file will contain
                  the username, total score, and for each problem, the score and last submission
                  time.
                </p>
                <button
                  className="w-fit rounded-lg bg-indigo-600 p-2 hover:bg-indigo-700"
                  onClick={() =>
                    downloadCSV(contest.standings, problems, `${contest.title}_scores.csv`)
                  }
                >
                  Download Scores
                </button>
              </div>
            )}
            {isAdmin(user) && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold text-slate-200">Toggle Release Status</h3>
                <p className="text-slate-300">
                  Toggling the released status of the homework changes the visibility of the
                  homework to users.
                </p>
                <div className="flex flex-row items-center gap-2">
                  <Toggle enabled={contest.released} onClick={toggleRelease} />
                  <p className="text-lg text-slate-200">
                    {contest.released ? "Released" : "Not Released"}
                  </p>
                </div>
              </div>
            )}
            {isAdmin(user) && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold text-slate-200">Delete Homework</h3>
                <p className="text-slate-300">Deleting the homework irreversibly.</p>
                <button
                  className="w-fit rounded-lg bg-rose-600 p-2 hover:bg-rose-700"
                  onClick={() => setIsModalOpen(true)}
                >
                  Delete Homework
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (success) {
            router.push("/homeworks");
          } else if (finished) {
            setFinished(false);
            setMessage(
              `Are you sure you want to delete homework ${contest.title}? This action cannot be undone.`
            );
          }
        }}
        onConfirm={handleDelete}
        message={message}
        confirm={!isDeleting && !finished}
        loading={isDeleting}
        buttonStyle="danger"
      />

      <CumulativeModal
        isOpen={isCululativeModalOpen}
        onClose={() => setIsCumulativeModalOpen(false)}
        data={totalScoreList}
      />
    </div>
  );
}
