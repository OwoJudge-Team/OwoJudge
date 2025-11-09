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
        <div className="text-2xl text-gray-900 font-bold">Submission {id}</div>
      </div>

      <div className="grid grid-cols-3 justify-items-center border rounded-lg shadow-sm px-4 py-6 justify-between mb-8">
        <div className="text-s text-gray-400 mb-4">Result</div>
        <div></div>
        <div className="text-s text-gray-400 mb-4">Score</div>

        <div className={`text-6xl font-semibold ${getStatusColor(status)}`}>{status}</div>
        <div className="text-6xl font-light text-gray-600">×</div>
        <div className="text-6xl  text-gray-800 mb-4">{score}</div>
      </div>

      <div className="border rounded-lg shadow-sm p-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-400">Problem</div>
            <div className="font-medium">{problem}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400">User</div>
            <div className="font-medium">{user}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400">Submission timestamp</div>
            <div className="font-medium">{createdTime}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400">Runtime</div>
            <div className="font-medium">{time}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400">Memory</div>
            <div className="font-medium">{memory}</div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-3">Testcases</h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-left table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-sm text-gray-500">Testcase Id</th>
                <th className="px-4 py-3 text-sm text-gray-500">Time</th>
                <th className="px-4 py-3 text-sm text-gray-500">Memory</th>
                <th className="px-4 py-3 text-sm text-gray-500">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td className="px-4 py-5" colSpan={4}>
                    <div className="text-sm text-gray-500">No testcase details available.</div>
                  </td>
                </tr>
              ) : (
                results.map((r, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-3 text-sm">{r.testcase}</td>
                    <td className="px-4 py-3 text-sm">{r.time.toFixed(3)} s</td>
                    <td className="px-4 py-3 text-sm">{r.memory} MB</td>
                    <td className={`px-4 py-3 text-sm font-medium ${getStatusColor(r.status)}`}>{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-lg font-semibold mb-3">Code</h3>
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