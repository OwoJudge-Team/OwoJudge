"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Submission, StatusToCode, SubmissionStatus } from "@/constants/submissions";
import { formatISOTime } from "@/utils/time";
import { apiGet } from "@/utils/api";
import { FaClock, FaFloppyDisk, FaSpinner } from "react-icons/fa6";
import CoolLink from "@/components/cool-link";
import { getStatusColor } from "@/utils/submission-status";
import Paginator from "@/components/Paginator";

const SubmissionPage: React.FC = () => {
  const [view, setView] = useState<"global" | "user">("global"); // Switch between global/user submissions
  const [searchUser, setSearchUser] = useState("");
  const [searchProblem, setSearchProblem] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [submissions, setSubmissions] = useState<Array<Submission>>([]);
  const limit: number = Number(useSearchParams().get('limit') || 20);
  const offset: number = Number(useSearchParams().get('offset') || 0);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await apiGet(`/api/submissions?limit=${limit}&offset=${offset}`);
        const data = await res.json();
        setTotalCount(data.total);
        setSubmissions(data.submissions);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      }
    };

    fetchSubmissions();
  }, [limit, offset]);

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl">
        {/* View Switch (Global/User Submissions) */}
        <div className="mb-4 flex items-center">
          <button
            onClick={() => setView("global")}
            className={`mr-4 rounded-lg px-4 py-2 ${
              view === "global" ? "bg-slate-700 text-slate-100" : "text-slate-300"
            } transition`}
          >
            Global Submissions
          </button>
          <button
            onClick={() => setView("user")}
            className={`rounded-lg px-4 py-2 ${
              view === "user" ? "bg-slate-700 text-slate-100" : "text-slate-300"
            } transition`}
          >
            My Submissions
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-background p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* User Search */}
            <input
              type="text"
              placeholder="Search by User"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
            />
            {/* Problem Search */}
            <input
              type="text"
              placeholder="Search by Problem"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={searchProblem}
              onChange={(e) => setSearchProblem(e.target.value)}
            />
            {/* Language Filter */}
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value="">Filter by Language</option>
              <option value="Python">Python</option>
              <option value="C++">C++</option>
              <option value="JavaScript">JavaScript</option>
              <option value="Java">Java</option>
            </select>
            {/* Status Filter */}
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Filter by Status</option>
              <option value="AC">AC (Accepted)</option>
              <option value="WA">WA (Wrong Answer)</option>
              <option value="TLE">TLE (Time Limit Exceeded)</option>
              <option value="MLE">MLE (Memory Limit Exceeded)</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-hidden rounded-lg border-slate-700 bg-slate-800 shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-primary-light text-slate-400">
              <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Problem</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {submissions.map((submission) => (
                <tr key={submission.serialNumber} className="transition hover:bg-neutral">
                  <td className="px-6 py-4">
                    <CoolLink
                      href={`/submissions/${submission.serialNumber}`}
                      text={String(submission.serialNumber)}
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-100">{formatISOTime(submission.createdTime)}</td>
                  <td className="px-6 py-4">
                    <CoolLink href={`/users/${submission.userID}`} text={submission.userHandle} />
                  </td>
                  <td className="px-6 py-4">
                    <CoolLink
                      href={`/problems/${submission.problemSerialNumber}`}
                      text={submission.problemTitle}
                    />
                  </td>
                  <td className="px-6 py-4">
                    {submission.status === SubmissionStatus.PD || submission.status === SubmissionStatus.QU ? (
                      <div className="flex items-center justify-center w-[5ch]">
                        <FaSpinner className="animate-spin text-xl text-slate-300" />
                      </div>
                    ) : (
                      <div
                        className={`${getStatusColor(submission.status)} w-[5ch] rounded-md p-1 text-center text-slate-100`}
                      >
                        {StatusToCode[submission.status]}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-around rounded-xl bg-slate-600/50 p-1">
                      <FaClock />
                      {submission.time}s
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-around rounded-xl bg-slate-600/50 p-1">
                      <FaFloppyDisk />
                      {submission.memory}MB
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator totalCount={totalCount} defaultLimit={limit}/>
      </div>
    </div>
  );
};

export default SubmissionPage;
