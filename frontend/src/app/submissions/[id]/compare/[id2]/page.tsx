"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Submission, Result, TestCaseResult, StatusToCode } from "@/constants/submissions";
import { formatISOTime } from "@/utils/time";
import { apiGet } from "@/utils/api";
import { getStatusColor } from "@/utils/submission-status";
import * as Diff from "diff";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  FaUser,
  FaClock,
  FaMemory,
  FaCalendarAlt,
  FaCode,
  FaExclamationTriangle,
} from "react-icons/fa";

// Language mapping for syntax highlighting
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

interface PairedResult {
  testcase: string;
  groupName?: string;
  left?: TestCaseResult;
  right?: TestCaseResult;
  changed: boolean;
}

export default function ComparePage() {
  const params = useParams();
  // Using id and id2 as per the directory structure [id]/compare/[id2]
  const leftId = params.id as string;
  const rightId = params.id2 as string;
  const [leftSub, setLeftSub] = useState<Submission | null>(null);
  const [rightSub, setRightSub] = useState<Submission | null>(null);

  useEffect(() => {
    const fetchSubmission = async (id: string): Promise<Submission | null> => {
      try {
        const res = await apiGet(`/api/submission/${id}`);
        if (!res.ok) {
          console.error(`Failed to fetch submission ${id}:`, res.statusText);
          return null;
        }
        const data = await res.json();
        return data as Submission;
      } catch (error) {
        console.error(`Error fetching submission ${id}:`, error);
        return null;
      }
    };

    fetchSubmission(leftId).then(setLeftSub);
    fetchSubmission(rightId).then(setRightSub);
  }, [leftId, rightId]);

  // Compute Code Diff
  const codeDiff = useMemo(() => {
    if (!leftSub || !rightSub) return [];
    return Diff.diffLines(leftSub.userSolution[0].content, rightSub.userSolution[0].content, {
      ignoreWhitespace: false,
    });
  }, [leftSub, rightSub]);

  // Compute Testcase Comparison
  const pairedResults = useMemo(() => {
    if (!leftSub || !rightSub) return new Map<string, PairedResult[]>();
    // Helper: normalize results into flat arrays of { groupName, ...testcase }
    const normalize = (results: Result) => {
      return Object.entries(results).flatMap(([groupName, group]) =>
        (group.testcases || []).map((tc: TestCaseResult) => ({ groupName, ...tc }))
      );
    };

    const flatLeft = normalize(leftSub.results);
    const flatRight = normalize(rightSub.results);

    // Build a map of groupName -> Set(testcase)
    const allGroups = new Set<string>([
      ...flatLeft.map((r) => r.groupName),
      ...flatRight.map((r) => r.groupName),
    ]);

    const allTestcasesMap = new Map<string, Set<string>>();
    for (const g of allGroups) {
      const set = new Set<string>();
      flatLeft.filter((r) => r.groupName === g).forEach((r) => set.add(r.testcase));
      flatRight.filter((r) => r.groupName === g).forEach((r) => set.add(r.testcase));
      allTestcasesMap.set(g, set);
    }

    // Convert to map of groupName -> PairedResult[]
    const resultMap = new Map<string, PairedResult[]>();
    Array.from(allTestcasesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([groupName, set]) => {
        const paired = Array.from(set)
          .sort()
          .map((tc) => {
            const leftRes = flatLeft.find((r) => r.groupName === groupName && r.testcase === tc);
            const rightRes = flatRight.find((r) => r.groupName === groupName && r.testcase === tc);
            return {
              testcase: tc,
              left: leftRes as TestCaseResult,
              right: rightRes as TestCaseResult,
              changed: leftRes?.status !== rightRes?.status,
            } as PairedResult;
          });
        resultMap.set(groupName, paired);
      });
    return resultMap;
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
  const differentProblems = leftSub.problemSerialNumber !== rightSub.problemSerialNumber;

  return (
    <div className="mx-auto max-w-7xl p-6 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compare Submissions</h1>
        {differentProblems && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/20 px-4 py-2 text-sm text-yellow-200">
            <FaExclamationTriangle />
            Warning: Submissions belong to different problems
          </div>
        )}
      </div>

      {/* Header Comparison */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SubmissionHeader submission={leftSub} side="Left" />
        <SubmissionHeader submission={rightSub} side="Right" />
      </div>

      {/* Code Diff Section */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FaCode /> Code Diff
          </h3>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 font-mono text-sm shadow-inner">
          <CodeDiffViewer diff={codeDiff} language={leftSub.language} />
        </div>
      </div>

      {/* Testcase Comparison Section */}
      <div className="mb-12">
        <h3 className="mb-3 text-lg font-semibold">Testcase Comparison</h3>
        <div className="mb-6">
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
                {Array.from(pairedResults.entries()).map(([groupName, rows]) => (
                  <React.Fragment key={groupName}>
                    <tr>
                      <td
                        className="border-t border-slate-700 px-4 py-3 font-semibold text-slate-200"
                        colSpan={5}
                      >
                        {groupName}
                      </td>
                    </tr>
                    {rows.map((row) => (
                      <TestcaseRow key={row.testcase} row={row} />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmissionHeader({ submission, side }: { submission: Submission; side: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-md transition-all hover:border-slate-600">
      <div className="border-b border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
            {side} Submission
          </span>
          <span className="rounded bg-slate-700 px-2 py-1 font-mono text-xs text-slate-300">
            #{submission.serialNumber}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-bold text-slate-100 shadow-sm ${getStatusColor(
              submission.status
            )}`}
          >
            {StatusToCode[submission.status]}
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-100">{submission.score}</div>
            <div className="text-xs uppercase text-slate-500">Points</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <FaUser className="text-slate-500" /> User
          </div>
          <div className="font-medium text-slate-200">{submission.userHandle}</div>

          <div className="flex items-center gap-2 text-slate-400">
            <FaCode className="text-slate-500" /> Language
          </div>
          <div className="font-medium text-slate-200">{submission.language}</div>

          <div className="flex items-center gap-2 text-slate-400">
            <FaClock className="text-slate-500" /> Time
          </div>
          <div className="font-medium text-slate-200">{submission.time}</div>

          <div className="flex items-center gap-2 text-slate-400">
            <FaMemory className="text-slate-500" /> Memory
          </div>
          <div className="font-medium text-slate-200">{submission.memory}</div>

          <div className="flex items-center gap-2 text-slate-400">
            <FaCalendarAlt className="text-slate-500" /> Date
          </div>
          <div className="font-medium text-slate-200">{formatISOTime(submission.createdTime)}</div>
        </div>
      </div>
    </div>
  );
}

function CodeDiffViewer({ diff, language }: { diff: Diff.Change[]; language: string }) {
  let leftLineNumber = 1;
  let rightLineNumber = 1;

  const prismLanguage = LANGUAGE_MAPPING[language] || "text";

  return (
    <table className="w-full border-collapse">
      <tbody>
        {diff.map((part, partIndex) => {
          const lines = part.value.split("\n");
          // Remove the last element if it's empty (result of split on trailing newline)
          if (lines[lines.length - 1] === "") {
            lines.pop();
          }

          const isAdded = part.added;
          const isRemoved = part.removed;

          // Colors
          const rowBg = isAdded
            ? "bg-green-500/10"
            : isRemoved
              ? "bg-red-500/10"
              : "bg-transparent";

          const gutterBg = isAdded
            ? "bg-green-500/20 text-green-500"
            : isRemoved
              ? "bg-red-500/20 text-red-500"
              : "bg-slate-800 text-slate-500";

          return lines.map((line, lineIndex) => {
            const showLeft = !isAdded;
            const showRight = !isRemoved;
            const lNum = showLeft ? leftLineNumber++ : null;
            const rNum = showRight ? rightLineNumber++ : null;

            return (
              <tr key={`${partIndex}-${lineIndex}`} className={rowBg}>
                <td
                  className={`w-12 select-none border-r border-slate-700 py-0.5 pr-2 text-right font-mono text-xs ${gutterBg}`}
                >
                  {lNum}
                </td>
                <td
                  className={`w-12 select-none border-r border-slate-700 py-0.5 pr-2 text-right font-mono text-xs ${gutterBg}`}
                >
                  {rNum}
                </td>
                <td className="whitespace-pre-wrap py-0.5 pl-4 font-mono text-sm leading-5 text-slate-300">
                  <SyntaxHighlighter
                    language={prismLanguage}
                    style={nord}
                    PreTag="span"
                    CodeTag="span"
                    customStyle={{
                      background: "transparent",
                      padding: 0,
                      margin: 0,
                      fontSize: "inherit",
                      lineHeight: "inherit",
                    }}
                    wrapLongLines={true}
                    codeTagProps={{
                      style: {
                        // fontFamily: '"Fira Mono", "JetBrains Mono", "Consolas", monospace',
                        fontVariantLigatures: "none",
                        fontWeight: 400,
                      },
                    }}
                  >
                    {line || " "}
                  </SyntaxHighlighter>
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
  const [expanded, setExpanded] = useState(false);

  // Helper to format memory/time diff
  const getDiff = (left: number, right: number, unit: string) => {
    const diff = right - left;
    const sign = diff > 0 ? "+" : "";
    const color = diff > 0 ? "text-red-400" : diff < 0 ? "text-green-400" : "text-slate-500";
    if (diff === 0) return <span className="text-slate-600">-</span>;
    return (
      <span className={color}>
        {sign}
        {diff.toFixed(2)}
        {unit}
      </span>
    );
  };

  return (
    <>
      <tr
        className={`cursor-pointer border-t border-slate-700 text-slate-100 transition-colors hover:bg-slate-700/30 ${
          row.changed ? "bg-yellow-500/5" : ""
        } ${expanded ? "bg-slate-700/40" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-medium">{row.testcase}</td>
        <td className="px-4 py-3">
          {row.left ? (
            <span
              className={`${getStatusColor(row.left.status)} rounded px-1.5 py-0.5 text-xs font-bold`}
            >
              {StatusToCode[row.left.status]}
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
              {StatusToCode[row.right.status]}
            </span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {row.changed && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
              title="Result Changed"
            ></span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-400">
          <button className="text-xs font-semibold uppercase text-blue-400 hover:text-blue-300">
            {expanded ? "Hide" : "Details"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={5} className="p-0">
            <div className="border-t border-slate-800 bg-slate-900/50 p-4 shadow-inner">
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                      <th className="w-1/4 px-4 py-2 text-left">Metric</th>
                      <th className="w-1/4 px-4 py-2 text-left">Left</th>
                      <th className="w-1/4 px-4 py-2 text-left">Right</th>
                      <th className="w-1/4 px-4 py-2 text-left">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800/50">
                      <td className="px-4 py-2 font-medium text-slate-400">Time</td>
                      <td className="px-4 py-2 text-slate-300">{row.left?.time}s</td>
                      <td className="px-4 py-2 text-slate-300">{row.right?.time}s</td>
                      <td className="px-4 py-2 font-mono">
                        {row.left && row.right ? getDiff(row.left.time, row.right.time, "s") : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-medium text-slate-400">Memory</td>
                      <td className="px-4 py-2 text-slate-300">{row.left?.memory}MB</td>
                      <td className="px-4 py-2 text-slate-300">{row.right?.memory}MB</td>
                      <td className="px-4 py-2 font-mono">
                        {row.left && row.right
                          ? getDiff(row.left.memory, row.right.memory, "MB")
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    Left Message
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                    {row.left?.message || <span className="italic text-slate-600">No message</span>}
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    Right Message
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300">
                    {row.right?.message || (
                      <span className="italic text-slate-600">No message</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
