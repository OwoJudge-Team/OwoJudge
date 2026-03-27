"use client";
import React, { useEffect, useState } from "react";
import { apiGet, apiDelete, apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Problem } from "@/types/problems";
import { FaClock, FaMemory } from "react-icons/fa6";
import Modal from "@/components/Modal";
import ProblemClient from "./problem-client";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import Loading from "@/components/Loading";
import { isAdmin, isAdminOrTA } from "@/utils/users";
import Toggle from "@/components/Toggle";
import PieChart from "@/app/problems/components/Pie";
import StatsButton from "@/components/StatsButton";

const SHOW_SUBMIT = false;

const PROBLEM_STATUS_COLORS: Record<string, string> = {
  ready: "bg-green-500",
  waiting: "bg-orange-500",
  error: "bg-red-500",
};

export default function ProblemPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [finished, setFinished] = useState(false);
  const [ModalTextStyle, setModalTextStyle] = useState<"normal" | "log">("normal");
  const [isPieOpen, setIsPieOpen] = useState(false);
  const { user } = useAuth();
  const [data, setData] = useState<Problem | null>(null);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await apiGet(`/api/problems/${id}`);
        const problemData = await res.json();
        setData(problemData);
        setMessage(
          `Are you sure you want to delete problem #${problemData.serialNumber} ${problemData.title}? This action cannot be undone.`
        );
      } catch (error) {
        console.error("Failed to fetch problem data:", error);
      }
    };

    fetchProblem();
  }, [id]);

  const toggleRelease = async () => {
    try {
      const res = await apiFetch(`/api/problems/${id}`, {
        method: "PATCH",
        body: { released: !data?.released },
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        setData((prevData) =>
          prevData ? { ...prevData, released: !prevData.released } : prevData
        );
        setMessage(`Problem is now ${!data?.released ? "released" : "unreleased"}.`);
        setFinished(true);
        setIsModalOpen(true);
      } else {
        setMessage(`Problem is not ${!data?.released ? "released" : "unreleased"} successfully.`);
        setFinished(true);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error toggling release status:", error);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await apiDelete(`/api/problems/${id}`);
      if (res.ok) {
        setMessage("Problem deleted successfully. Back to problems list.");
        setSuccess(true);
      } else {
        setMessage("Failed to delete the problem.");
      }
    } catch (error) {
      setMessage("An error occurred while deleting the problem.");
      console.error("Error deleting problem:", error);
    } finally {
      setIsDeleting(false);
      setFinished(true);
    }
  };

  if (!data) {
    return <Loading message="Loading problem..." />;
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Redesigned Header with Card Background */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl md:flex-row">
          <div>
            <div className="mb-4 flex items-baseline gap-4">
              <span className="text-3xl font-light text-slate-400">#{data.serialNumber}</span>
              <h1 className="text-4xl font-bold tracking-tight text-slate-100">{data.title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-slate-400 md:gap-6">
              <div className="flex items-center gap-2">
                <FaClock className="text-indigo-400" />
                <span className="text-nowrap font-medium text-slate-200">{data.timeLimit} s</span>
                <span className="text-nowrap text-sm">time limit</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <div className="flex items-center gap-2">
                <FaMemory className="text-purple-400" />
                <span className="text-nowrap font-medium text-slate-200">
                  {data.memoryLimit} MB
                </span>
                <span className="text-nowrap text-sm">memory limit</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatsButton size="sm" onClick={() => setIsPieOpen(true)} />

            {isAdminOrTA(user) && (
              <div
                className="flex cursor-pointer items-center gap-2 rounded-md bg-slate-700/50 px-3 py-1 hover:bg-slate-700/80"
                onClick={() => {
                  setMessage(
                    data.statusReason === undefined || data.statusReason === ""
                      ? `Problem status: ${data.status.toUpperCase()}, no additional reason provided.`
                      : data.statusReason
                  );
                  setFinished(true);
                  setIsModalOpen(true);
                  setModalTextStyle("log");
                }}
              >
                <div
                  className={`h-2 w-2 rounded-full ${PROBLEM_STATUS_COLORS[data.status] || "bg-gray-500"}`}
                ></div>
                <span className="text-sm text-slate-300">{data.status.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Problem Description with Card Background */}
        {data.description && (
          <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <MarkdownRenderer content={data.description} />
          </section>
        )}

        {isAdminOrTA(user) && (
          <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-slate-100">Privileged Actions</h2>
            <div className="flex flex-col gap-8">
              {isAdminOrTA(user) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold text-slate-200">Update Problem</h3>
                  <p className="text-slate-300">
                    Re-upload a compressed problem file (.tar.gz) to update the problem.
                  </p>
                  <button
                    className="w-fit rounded-lg bg-indigo-600 p-2 hover:bg-indigo-700"
                    onClick={() => router.push(`/problems/update/${data.serialNumber}`)}
                  >
                    Update Problem
                  </button>
                </div>
              )}
              {isAdmin(user) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold text-slate-200">Toggle Release Status</h3>
                  <p className="text-slate-300">
                    Toggling the released status of the problem changes the visibility of the
                    problem to users.
                  </p>
                  <div className="flex flex-row items-center gap-2">
                    <Toggle enabled={data.released} onClick={toggleRelease} />
                    <p className="text-lg text-slate-200">
                      {data.released ? "Released" : "Not Released"}
                    </p>
                  </div>
                </div>
              )}
              {isAdmin(user) && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-semibold text-slate-200">Delete Problem</h3>
                  <p className="text-slate-300">Deleting the problem irreversibly.</p>
                  <button
                    className="w-fit rounded-lg bg-rose-600 p-2 hover:bg-rose-700"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Delete Problem
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Submit Section (Controlled by Dev Variable) */}
        {SHOW_SUBMIT && (
          <div className="mt-8">
            <ProblemClient displayID={String(data.serialNumber)} />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalTextStyle("normal");
          if (success) {
            router.push("/problems");
          } else if (finished) {
            setFinished(false);
            setMessage(
              `Are you sure you want to delete problem #${data.serialNumber} ${data.title}? This action cannot be undone.`
            );
          }
        }}
        onConfirm={handleDelete}
        message={message}
        confirm={!isDeleting && !finished}
        loading={isDeleting}
        buttonStyle="danger"
        textStyle={ModalTextStyle}
      />

      <PieChart
        submissionDetail={data.submissionDetail}
        isOpen={isPieOpen}
        onClose={() => setIsPieOpen(false)}
      />
    </div>
  );
}
