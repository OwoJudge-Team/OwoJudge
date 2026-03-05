"use client";

import React, { useEffect, Fragment, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/utils/api";
import { Submission, StatusToCode } from "@/types/submissions";
import { formatISOTime } from "@/utils/time";
import { getStatusColor } from "@/utils/submission-status";
import { useAuth } from "@/contexts/AuthContext";
import { FaRotateRight } from "react-icons/fa6";
import Loading from "@/components/Loading";
import { isAdmin } from "@/utils/users";
import { HiDocumentAdd } from "react-icons/hi";
import Modal from "@/components/Modal";
import CodeBlock from "@/components/CodeBlock";

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
  const { user } = useAuth();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isRejudging, setIsRejudging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [currentTestcase, setCurrentTestcase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [finished, setFinished] = useState(false);

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await apiGet(`/api/submission/${id}`);
      const data = await res.json();
      setSubmission(data);
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleRejudge = async () => {
    if (!confirm("Are you sure you want to rejudge this submission?")) return;

    setIsRejudging(true);
    try {
      const res = await apiPost(`/api/rejudge/submission/${id}`);
      if (res.ok) {
        await fetchSubmission();
        alert("Rejudge triggered successfully.");
      } else {
        const errorMsg = await res.text();
        alert(`Failed to trigger rejudge: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Rejudge error:", error);
      alert("An error occurred while triggering rejudge.");
    } finally {
      setIsRejudging(false);
    }
  };

  const handleGenerateTestcase = async () => {
    setIsGenerating(true);
    try {
      const res = await apiGet(
        `/api/problems/${submission?.problemSerialNumber}/testcases/${currentTestcase}`
      );
      console.log(`/api/problems/${submission?.problemSerialNumber}/testcases/${currentTestcase}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/gzip" }));

        const link: HTMLAnchorElement = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          submission?.problemSerialNumber + "-" + currentTestcase + ".tar.gz"
        );

        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);
        setMessage("Testcase generated successfully.");
      } else {
        const errorMsg = await res.text();
        setMessage(`Unable to generate the testcase: ${errorMsg}`);
      }
    } catch (error) {
      setMessage("An error occurred while generating the testcase.");
      console.error("Error generating testcase:", error);
    } finally {
      setIsGenerating(false);
      setFinished(true);
    }
  };

  if (!submission) {
    return <Loading message="Loading submission..." />;
  }

  const {
    status,
    score,
    problemTitle,
    username,
    createdAt,
    time,
    memory,
    results,
    userSolution,
    language,
  } = submission;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold text-slate-300">Submission #{id}</div>
          {isAdmin(user) && (
            <button
              onClick={handleRejudge}
              disabled={isRejudging}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-800"
              title="Rejudge Submission"
            >
              <FaRotateRight className={`${isRejudging ? "animate-spin" : ""}`} />
              {isRejudging ? "Rejudging..." : "Rejudge"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
        <div className="grid grid-cols-3 items-center justify-between justify-items-center px-4 py-6">
          <div className="text-s mb-4 text-slate-400">Result</div>
          <div></div>
          <div className="text-s mb-4 text-slate-400">Score</div>

          <div
            className={`text-5xl font-semibold bg-${getStatusColor(status)} rounded-lg p-3 text-slate-100`}
          >
            {StatusToCode[status]}
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
              <div className="font-medium text-slate-100">{problemTitle}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-gray-400">User</div>
              <div className="font-medium text-slate-100">{username}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Submission timestamp</div>
              <div className="font-medium text-slate-100">{formatISOTime(createdAt)}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Runtime</div>
              <div className="font-medium text-slate-100">{time} s</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-400">Memory</div>
              <div className="font-medium text-slate-100">{memory} KB</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Testcases</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          <table className="min-w-full table-auto text-left">
            <thead className="text-slate-400">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Memory</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {!results ? (
                <tr>
                  <td className="px-4 py-5" colSpan={4}>
                    <div className="text-sm text-slate-500">No testcase details available.</div>
                  </td>
                </tr>
              ) : (
                Object.entries(results).map(([groupName, groupResult]) => (
                  <Fragment key={groupName}>
                    <tr className="border-t border-slate-700 bg-slate-700/30">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-slate-200">
                        {groupName}
                      </td>
                    </tr>
                    {groupResult.testcases.map((testcase, index) => (
                      <tr
                        key={`${groupName}-${index}`}
                        className="border-t border-slate-700 text-slate-100"
                      >
                        <td className="group/button px-4 py-3 text-sm hover:text-indigo-400">
                          <button
                            className="inline-flex items-center"
                            onClick={() => {
                              setCurrentTestcase(testcase.testcase);
                              setMessage(
                                `Generate new test data for test case ${testcase.testcase}?`
                              );
                              setIsModalOpen(true);
                            }}
                          >
                            <span className="transition-transform duration-150 group-hover/button:translate-x-1">
                              {testcase.testcase}
                            </span>
                            <HiDocumentAdd className="-translate-x-2 -translate-y-[1px] text-lg opacity-0 transition-all duration-150 group-hover/button:translate-x-2 group-hover/button:opacity-100" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">{testcase.time.toFixed(3)} s</td>
                        <td className="px-4 py-3 text-sm">{testcase.memory} KB</td>
                        <td className={`px-4 py-3 text-sm font-medium`}>
                          <div
                            className={`bg-${getStatusColor(testcase.status)} w-[5ch] rounded-md p-1 text-center text-slate-100`}
                          >
                            {StatusToCode[testcase.status]}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Code</h3>
        <CodeBlock language={LANGUAGE_MAPPING[language] || "c"}>
          {userSolution[0].content}
        </CodeBlock>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (finished) {
            setFinished(false);
          }
        }}
        onConfirm={handleGenerateTestcase}
        message={message}
        confirm={!isGenerating && !finished}
        loading={isGenerating}
      />
    </div>
  );
}
