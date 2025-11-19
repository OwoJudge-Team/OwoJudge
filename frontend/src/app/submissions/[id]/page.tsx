"use client";

import React from "react";
import { submissions } from "@/constants/submissions";
import { useParams } from "next/navigation";
import { getStatusColor } from "@/utils/submission-status";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';

const LANGUAGE_MAPPING: { [key: string]: string } = {
  "C++": "cpp",
  "Python": "python",
  "Java": "java",
  "JavaScript": "javascript",
  "TypeScript": "typescript",
  "C": "c",
  "Ruby": "ruby",
  "Go": "go",
  "Rust": "rust",
}

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

  const { status, score, problem, user, createdTime, time, memory, results, userSolution, language } = submission;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="text-2xl text-slate-300 font-bold">Submission {id}</div>
      </div>

      <div className="border border-slate-700 rounded-lg shadow-sm mb-8 bg-slate-800">
        <div className="grid grid-cols-3 items-center justify-items-center px-4 py-6 justify-between">
          <div className="text-s text-slate-400 mb-4">Result</div>
          <div></div>
          <div className="text-s text-slate-400 mb-4">Score</div>

          <div className={`text-5xl font-semibold bg-${getStatusColor(status)} rounded-lg p-3 text-slate-100`}>{status}</div>
          <div className="text-6xl font-light text-slate-400">×</div>
          <div className="text-5xl font-semibold bg-slate-600/50 rounded-lg p-3 text-slate-100">{score}</div>
        </div>

        <hr className="h-1 w-20 mx-auto my-8 border-0 bg-slate-700"/>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-slate-400 mb-1">Problem</div>
              <div className="font-medium text-slate-100">{problem}</div>
            </div>

            <div>
              <div className="text-xs text-gray-400 mb-1">User</div>
              <div className="font-medium text-slate-100">{user}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1">Submission timestamp</div>
              <div className="font-medium text-slate-100">{createdTime}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1">Runtime</div>
              <div className="font-medium text-slate-100">{time}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1">Memory</div>
              <div className="font-medium text-slate-100">{memory}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-slate-100">Testcases</h3>
        <div className="overflow-x-auto border rounded-lg border-slate-700 bg-slate-800 shadow-lg">
          <table className="min-w-full text-left table-auto">
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
                  <tr key={index} className="border-t text-slate-100 border-slate-700">
                    <td className="px-4 py-3 text-sm">{r.testcase}</td>
                    <td className="px-4 py-3 text-sm">{r.time.toFixed(3)} s</td>
                    <td className="px-4 py-3 text-sm">{r.memory} MB</td>
                    <td className={`px-4 py-3 text-sm font-medium`}>
                      <div className={`bg-${getStatusColor(r.status)} rounded-md text-slate-100 text-center w-[5ch] p-1`}>
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
        <h3 className="text-lg font-semibold mb-3 text-slate-100">Code</h3>
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