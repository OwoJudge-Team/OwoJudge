"use client";

import { useState } from "react";
import Link from "next/link";
import { submissions } from "@/constants/submissions";
import { FaClock } from "react-icons/fa";
import { FaFloppyDisk } from "react-icons/fa6";
import CoolLink from "@/components/cool-link";

const getStatusColor = {
  AC: "bg-green-600/50",
  WA: "bg-red-600/50",
  TLE: "bg-blue-600/50",
  MLE: "bg-purple-600/50",
};

const SubmissionPage: React.FC = () => {
  const [view, setView] = useState<"global" | "user">("global"); // Switch between global/user submissions
  const [searchUser, setSearchUser] = useState("");
  const [searchProblem, setSearchProblem] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Function to filter submissions based on the search and filters
  const filteredSubmissions = submissions.filter((submission) => {
    return (
      (view === "global" || submission.user === "alice") && // Replace 'alice' with current logged-in user
      (!searchUser || submission.user.toLowerCase().includes(searchUser.toLowerCase())) &&
      (!searchProblem || submission.problem.toLowerCase().includes(searchProblem.toLowerCase())) &&
      (!filterLanguage || submission.language === filterLanguage) &&
      (!filterStatus || submission.status === filterStatus)
    );
  });

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
              <tr className="border-b border-slate-700">
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
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="transition hover:bg-neutral">
                  <td className="px-6 py-4">
                    <Link
                      href={`/submissions/${submission.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/80 hover:text-indigo-400"
                    >
                      {submission.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-slate-100">{submission.createdTime}</td>
                  <td className="px-6 py-4">
                    <CoolLink href={`/users/${submission.userID}`} text={submission.user} />
                  </td>
                  <td className="px-6 py-4">
                    <CoolLink
                      href={`/problems/${submission.problemID}`}
                      text={submission.problem}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`${getStatusColor[submission.status]} w-[5ch] rounded-md p-1 text-center text-slate-100`}
                    >
                      {submission.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-around rounded-xl bg-slate-600/50 p-1">
                      <FaClock />
                      {submission.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-around rounded-xl bg-slate-600/50 p-1">
                      <FaFloppyDisk />
                      {submission.memory}
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

export default SubmissionPage;
