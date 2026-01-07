"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";
import { Submission, StatusToCode, SubmissionStatus } from "@/types/submissions";
import { formatISOTime } from "@/utils/time";
import { apiGet, apiPost } from "@/utils/api";
import { FaClock, FaFloppyDisk, FaSpinner, FaRotateRight } from "react-icons/fa6";
import CoolLink from "@/components/cool-link";
import { getStatusColor } from "@/utils/submission-status";
import Paginator from "@/components/Paginator";
import { isAdmin, isAdminOrTA } from "@/utils/users";

const SubmissionPage: React.FC = () => {
  const [view, setView] = useState<"global" | "user">("global");
  const [searchUser, setSearchUser] = useState("");
  const [searchProblem, setSearchProblem] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [submissions, setSubmissions] = useState<Array<Submission>>([]);
  const [limit, setLimit] = useState<number>(20);
  const [offset, setOffset] = useState<number>(0);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [isRejudging, setIsRejudging] = useState(false);

  const context = useAuth();
  const user = context?.user;

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (view === "user" && user) {
        params.set("username", String(user.username));
      } else if (searchUser) {
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
      setSelectedSubmissions(new Set());
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  }, [limit, offset, view, searchUser, searchProblem, filterStatus, user]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(submissions.map((s) => s.serialNumber));
      setSelectedSubmissions(allIds);
    } else {
      setSelectedSubmissions(new Set());
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleBatchRejudge = async () => {
    if (selectedSubmissions.size === 0) return;
    if (!confirm(`Rejudge ${selectedSubmissions.size} submissions?`)) return;

    setIsRejudging(true);
    try {
      const res = await apiPost(
        "/api/rejudge/submissions",
        {
          serialNumbers: Array.from(selectedSubmissions),
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.ok) {
        alert("Batch rejudge triggered successfully.");
        fetchSubmissions();
      } else {
        const err = await res.text();
        alert(`Rejudge failed: ${err}`);
      }
    } catch (error) {
      console.error("Rejudge error:", error);
      alert("An error occurred during rejudge.");
    } finally {
      setIsRejudging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          {/* View Switch (Global/User Submissions) */}
          {isAdminOrTA(user) && (
            <div className="flex items-center">
              <button
                onClick={() => setView("global")}
                className={`mr-4 rounded-lg px-4 py-2 ${
                  view === "global"
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-300 hover:text-slate-100"
                } transition`}
              >
                Global Submissions
              </button>
              <button
                onClick={() => setView("user")}
                className={`rounded-lg px-4 py-2 ${
                  view === "user"
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-300 hover:text-slate-100"
                } transition`}
              >
                My Submissions
              </button>
            </div>
          )}

          {/* Batch Actions */}
          {isAdmin(user) && selectedSubmissions.size > 0 && (
            <button
              onClick={handleBatchRejudge}
              disabled={isRejudging}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 hover:bg-indigo-500"
            >
              <FaRotateRight className={isRejudging ? "animate-spin" : ""} />
              Rejudge Selected ({selectedSubmissions.size})
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-xl">
          <div
            className={`grid grid-cols-1 gap-4 ${isAdminOrTA(user) ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            {/* User Search */}
            {isAdminOrTA(user) && (
              <input
                type="text"
                placeholder="Search by UserName"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            )}
            {/* Problem Search */}
            <input
              type="text"
              placeholder="Search by Problem ID"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              value={searchProblem}
              onChange={(e) => setSearchProblem(e.target.value)}
            />
            {/* Status Filter */}
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-slate-400">
              <tr className="border-b border-slate-700 text-xs font-semibold uppercase tracking-wider">
                {isAdmin(user) && (
                  <th className="w-12 px-6 py-4">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-5 w-5 cursor-pointer rounded border-2 border-slate-500 bg-slate-900/50 text-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                        onChange={handleSelectAll}
                        checked={
                          submissions.length > 0 && selectedSubmissions.size === submissions.length
                        }
                      />
                    </div>
                  </th>
                )}
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
              {submissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin(user) ? 8 : 7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No submissions found.
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => {
                  const isSelected = selectedSubmissions.has(submission.serialNumber);
                  return (
                    <tr
                      key={submission.serialNumber}
                      className={`transition-all duration-150 hover:bg-slate-700/50 ${
                        isSelected ? "bg-indigo-500/10" : ""
                      }`}
                    >
                      {isAdmin(user) && (
                        <td className="px-6 py-4 align-middle">
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              className="h-5 w-5 cursor-pointer rounded border-2 border-slate-500 bg-slate-900/50 text-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                              checked={isSelected}
                              onChange={() => handleSelectOne(submission.serialNumber)}
                            />
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 align-middle">
                        <CoolLink
                          href={`/submissions/${submission.serialNumber}`}
                          text={String(submission.serialNumber)}
                        />
                      </td>
                      <td className="px-6 py-4 align-middle text-sm text-slate-300">
                        {formatISOTime(submission.createdAt)}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <CoolLink
                          href={`/users/${submission.username}`}
                          text={submission.username}
                        />
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <CoolLink
                          href={`/problems/${submission.problemSerialNumber}`}
                          text={submission.problemTitle}
                        />
                      </td>

                      <td className="px-6 py-4 align-middle">
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
                          {submission.memory}KB
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
