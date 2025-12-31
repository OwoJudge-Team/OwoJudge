"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { submissions, Submission, Result } from "@/constants/submissions";
import { getStatusColor } from "@/utils/submission-status";
import * as Diff from "diff";

interface PairedResult {
  testcase: string;
  left?: Result;
  right?: Result;
  changed: boolean;
}

export default function ComparePage() {
  const params = useParams();
  const leftId = params.id as string;
  const rightId = params.id2 as string;

  const leftSub = submissions.find((sub) => sub.id.toString() === leftId);
  const rightSub = submissions.find((sub) => sub.id.toString() === rightId);

  console.log("Left Submission:", leftSub);
  console.log("Right Submission:", rightSub);

  // Compute Code Diff
  const codeDiff = useMemo(() => {
    if (!leftSub || !rightSub) return [];
    return Diff.diffLines(leftSub.userSolution.content, rightSub.userSolution.content, {
      ignoreWhitespace: false,
    });
  }, [leftSub, rightSub]);

  // Compute Testcase Comparison
  const pairedResults = useMemo(() => {
    if (!leftSub || !rightSub) return [];
    // Map by testcase name
    const rightMap = new Map(rightSub.results.map((r) => [r.testcase, r]));

    // Get all unique testcases from both
    const allTestcases = new Set([
      ...leftSub.results.map((r) => r.testcase),
      ...rightSub.results.map((r) => r.testcase),
    ]);

    return Array.from(allTestcases)
      .sort()
      .map((tc) => {
        const leftRes = leftSub.results.find((r) => r.testcase === tc);
        const rightRes = rightMap.get(tc);
        return {
          testcase: tc,
          left: leftRes,
          right: rightRes,
          changed: leftRes?.status !== rightRes?.status,
        } as PairedResult;
      });
  }, [leftSub, rightSub]);

  if (!leftSub || !rightSub) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-center">
          <p className="text-lg">
            {!leftSub && !rightSub
              ? "Submissions not found"
              : !leftSub
                ? `Submission ${leftId} not found`
                : `Submission ${rightId} not found`}
          </p>
        </div>
      </div>
    );
  }

  // Warning if problems differ
  const differentProblems = leftSub.problemID !== rightSub.problemID;

  return (
    <div className="mx-auto max-w-7xl p-6 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compare Submissions</h1>
        {differentProblems && (
          <div className="rounded-md border border-yellow-500/50 bg-yellow-500/20 px-4 py-2 text-sm text-yellow-200">
            Warning: Submissions belong to different problems
          </div>
        )}
      </div>

      {/* Header Comparison */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        {/* Left Submission Header */}
        <SubmissionHeader submission={leftSub} side="Left" />
        {/* Right Submission Header */}
        <SubmissionHeader submission={rightSub} side="Right" />
      </div>

      {/* Code Diff Section */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Code Diff</h3>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 font-mono text-sm">
          <CodeDiffViewer diff={codeDiff} />
        </div>
      </div>

      {/* Testcase Comparison Section */}
      <div className="mb-12">
        <h3 className="mb-3 text-lg font-semibold">Testcase Comparison</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          <table className="min-w-full table-auto text-left">
            <thead className="bg-slate-700/50 text-slate-400">
              <tr className="text-xs font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Left Status</th>
                <th className="px-4 py-3">Right Status</th>
                <th className="px-4 py-3 text-center">Changed</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {pairedResults.map((row) => (
                <TestcaseRow key={row.testcase} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubmissionHeader({ submission, side }: { submission: Submission; side: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{side} Submission</span>
        <span className="text-sm text-slate-500">#{submission.id}</span>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <div className={`text-xl font-bold ${getStatusColor(submission.status)}`}>
          {submission.status}
        </div>
        <div className="text-sm text-slate-400">{submission.score} pts</div>
      </div>
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div className="text-slate-400">User</div>
        <div>{submission.user}</div>

        <div className="text-slate-400">Language</div>
        <div>{submission.language}</div>

        <div className="text-slate-400">Time</div>
        <div>{submission.time}</div>

        <div className="text-slate-400">Memory</div>
        <div>{submission.memory}</div>

        <div className="text-slate-400">Date</div>
        <div>{submission.createdTime}</div>
      </div>
    </div>
  );
}

function CodeDiffViewer({ diff }: { diff: Diff.Change[] }) {
  let leftLineNumber = 1;
  let rightLineNumber = 1;

  return (
    <table className="w-full border-collapse">
      <tbody>
        {diff.map((part, partIndex) => {
          const lines = part.value.split("\n");
          // Remove the last element if it's empty (result of split on trailing newline)
          if (lines[lines.length - 1] === "") {
            lines.pop();
          }

          const colorClass = part.added
            ? "bg-green-900/30 text-green-100"
            : part.removed
              ? "bg-red-900/30 text-red-100"
              : "text-slate-300";

          const gutterClass = part.added
            ? "bg-green-900/20 text-green-500"
            : part.removed
              ? "bg-red-900/20 text-red-500"
              : "bg-slate-800 text-slate-500";

          return lines.map((line, lineIndex) => {
            const showLeft = !part.added;
            const showRight = !part.removed;
            const lNum = showLeft ? leftLineNumber++ : null;
            const rNum = showRight ? rightLineNumber++ : null;

            return (
              <tr key={`${partIndex}-${lineIndex}`} className={colorClass}>
                <td
                  className={`w-12 select-none border-r border-slate-700 py-0.5 pr-2 text-right font-mono text-xs ${gutterClass}`}
                >
                  {lNum}
                </td>
                <td
                  className={`w-12 select-none border-r border-slate-700 py-0.5 pr-2 text-right font-mono text-xs ${gutterClass}`}
                >
                  {rNum}
                </td>
                <td className="whitespace-pre-wrap py-0.5 pl-4 font-mono text-sm leading-5">
                  <span className="select-text">{line}</span>
                </td>
              </tr>
            );
          });
        })}
      </tbody>
    </table>
  );
}

function TestcaseRow({ row }: { row: PairedResult }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <tr
        className={`cursor-pointer border-t border-slate-700 text-slate-100 hover:bg-slate-700/30 ${row.changed ? "bg-yellow-500/5" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-medium">{row.testcase}</td>
        <td className="px-4 py-3">
          {row.left ? (
            <span
              className={`${getStatusColor(row.left.status)} rounded px-1.5 py-0.5 text-xs font-bold`}
            >
              {row.left.status}
            </span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          {row.right ? (
            <span
              className={`${getStatusColor(row.right.status)} rounded px-1.5 py-0.5 text-xs font-bold`}
            >
              {row.right.status}
            </span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {row.changed && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-yellow-500"
              title="Result Changed"
            ></span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-400">{expanded ? "Hide" : "Show"}</td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                  Left Message
                </div>
                <div className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">
                  {row.left?.message || "N/A"}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                  Right Message
                </div>
                <div className="rounded bg-slate-950 p-2 font-mono text-xs text-slate-300">
                  {row.right?.message || "N/A"}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
