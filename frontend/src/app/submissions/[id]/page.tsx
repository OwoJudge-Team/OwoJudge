"use client";

import React from "react";
import { submissions } from "@/constants/submissions";
import { useParams } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getStatusColor } from "@/utils/submission-status";

const LANGUAGE_MAPPING: { [key: string]: string } = {
  "C++": "cpp",
  Python: "python",
  Java: "java",
  JavaScript: "javascript",
  TypeScript: "typescript",
  C: "c",
  Ruby: "ruby",
  Go: "go",
  Rust: "rust",
};

export default function SubmissionPage() {
  const id = useParams().id;

  const submission = submissions.find((sub) => sub.id.toString() === id);

  if (!submission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg text-gray-600">Loading submission...</p>
        </div>
      </div>
    );
  }

  const {
    status,
    score,
    problem,
    user,
    createdTime,
    time,
    memory,
    results,
    userSolution,
    language,
  } = submission;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="text-2xl font-bold text-slate-300">Submission {id}</div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
        <div className="grid grid-cols-3 items-center justify-between justify-items-center px-4 py-6">
          <div className="text-s mb-4 text-slate-400">Result</div>
          <div></div>
          <div className="text-s mb-4 text-slate-400">Score</div>

          <div
            className={`text-5xl font-semibold ${getStatusColor(status)} rounded-lg p-3 text-slate-100`}
          >
            {status}
          </div>
          <div className="text-6xl font-light text-slate-400">×</div>
          <div className="rounded-lg bg-slate-600/50 p-3 text-5xl font-semibold text-slate-100">
            {score}
          </div>
        </div>

        <hr className="mx-auto my-8 h-1 w-20 border-0 bg-slate-700" />

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-1 text-xs text-slate-400">Problem</div>
              <div className="font-medium text-slate-100">{problem}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-gray-400">User</div>
              <div className="font-medium text-slate-100">{user}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Submission timestamp</div>
              <div className="font-medium text-slate-100">{createdTime}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Runtime</div>
              <div className="font-medium text-slate-100">{time}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Memory</div>
              <div className="font-medium text-slate-100">{memory}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Testcases</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          <table className="min-w-full table-auto text-left">
            <thead className="text-slate-400">
              <tr>
                <th className="px-4 py-3 text-sm">#</th>
                <th className="px-4 py-3 text-sm">Time</th>
                <th className="px-4 py-3 text-sm">Memory</th>
                <th className="px-4 py-3 text-sm">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td className="px-4 py-5" colSpan={4}>
                    <div className="text-sm text-slate-500">No testcase details available.</div>
                  </td>
                </tr>
              ) : (
                results.map((r, index) => (
                  <tr key={index} className="border-t border-slate-700 text-slate-100">
                    <td className="px-4 py-3 text-sm">{r.testcase}</td>
                    <td className="px-4 py-3 text-sm">{r.time.toFixed(3)} s</td>
                    <td className="px-4 py-3 text-sm">{r.memory} MB</td>
                    <td className={`px-4 py-3 text-sm font-medium`}>
                      <div
                        className={`${getStatusColor(r.status)} w-[5ch] rounded-md p-1 text-center text-slate-100`}
                      >
                        {r.status}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Code</h3>
        <SyntaxHighlighter
          language={LANGUAGE_MAPPING[language] || "cpp"}
          style={nord}
          showLineNumbers={true}
        >
          {userSolution.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
