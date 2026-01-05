"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Submission, StatusToCode, SubmissionStatus } from "@/types/submissions";
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
  const [filterStatus, setFilterStatus] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [submissions, setSubmissions] = useState<Array<Submission>>([]);
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);

  const context = useAuth();
  const user = context?.user;

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(offset));
        if (view === "user" && user && user.isAdmin) {
          params.set("username", String(user.username));
        } else if (searchUser && user && user.isAdmin) {
          params.set("username", searchUser);
        }
        if (searchProblem) {
          params.set("problemSerialNumber", searchProblem);
        }
        if (filterStatus) {
          params.set("status", filterStatus);
        }
        const res = await apiGet(`/api/submissions?${params.toString()}`);
        const data = await res.json();
        setTotalCount(data.total);
        setSubmissions(data.submissions ?? []);

        console.log("Fetched submissions:", data.submissions);
      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      }
    };

    fetchSubmissions();
  }, [limit, offset, view, searchUser, searchProblem, filterStatus, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-light">
        <p className="text-slate-300">Please log in to view submissions.</p>
      </div>
    );
  }

  if (!submissions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-light">
        <p className="text-slate-300">Loading submissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl">
        {/* View Switch (Global/User Submissions) */}
        {user.isAdmin && (
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
        )}

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-background p-4 shadow-lg">
          <div
            className={`grid grid-cols-2 gap-4 ${user.isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {/* User Search */}
            {user.isAdmin && (
              <input
                type="text"
                placeholder="Search by UserName"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            )}
            {/* Problem Search */}
            <input
              type="text"
              placeholder="Search by Problem ID"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={searchProblem}
              onChange={(e) => setSearchProblem(e.target.value)}
            />
            {/* Status Filter */}
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-100"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Filter by Status</option>
              {Object.entries(StatusToCode).map(([status, code]) => (
                <option key={code} value={status}>
                  {code} ({status})
                </option>
              ))}
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
                  <td className="px-6 py-4 text-slate-100">
                    {formatISOTime(submission.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <CoolLink href={`/users/${submission.username}`} text={submission.userHandle} />
                  </td>
                  <td className="px-6 py-4">
                    <CoolLink
                      href={`/problems/${submission.problemSerialNumber}`}
                      text={submission.problemTitle}
                    />
                  </td>
                  <td className="px-6 py-4">
                    {submission.status === SubmissionStatus.PD ||
                    submission.status === SubmissionStatus.QU ? (
                      <div className="flex w-[5ch] items-center justify-center">
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
                    <div className="flex items-center justify-around gap-1 rounded-xl bg-slate-600/50 p-1">
                      <FaClock />
                      {submission.time}s
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-around gap-1 rounded-xl bg-slate-600/50 p-1">
                      <FaFloppyDisk />
                      {submission.memory}MB
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator
          totalCount={totalCount}
          limit={limit}
          offset={offset}
          onChange={(newOffset, newLimit) => {
            if (typeof newLimit === "number") setLimit(newLimit);
            setOffset(newOffset);
          }}
        />
      </div>
    </div>
  );
};

export default SubmissionPage;
