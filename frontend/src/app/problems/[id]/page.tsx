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
import { isAdmin } from "@/utils/users";
import Toggle from "@/components/Toggle";

const SHOW_SUBMIT = false;

export default function ProblemPage() {
  const params = useParams();
  const id = params.id;
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [finished, setFinished] = useState(false);
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
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <div className="mb-4 flex items-baseline gap-4">
            <span className="text-3xl font-light text-slate-400">#{data.serialNumber}</span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-100">{data.title}</h1>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <FaClock className="text-indigo-400" />
              <span className="font-medium text-slate-200">{data.timeLimit} s</span>
              <span className="text-sm">time limit</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-2">
              <FaMemory className="text-purple-400" />
              <span className="font-medium text-slate-200">{data.memoryLimit} MB</span>
              <span className="text-sm">memory limit</span>
            </div>
          </div>
        </div>

        {/* Problem Description with Card Background */}
        {data.description && (
          <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <MarkdownRenderer content={data.description} />
          </section>
        )}

        {isAdmin(user) && (
          <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-slate-100">Admin Actions</h2>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-semibold text-slate-200">Toggle Release Status</h3>
                <p className="text-slate-300">
                  Toggling the released status of the problem changes the visibility of the problem
                  to users.
                </p>
                <div className="flex flex-row items-center gap-2">
                  <Toggle enabled={data.released} onClick={toggleRelease} />
                  <p className="text-lg text-slate-200">
                    {data.released ? "Released" : "Not Released"}
                  </p>
                </div>
              </div>
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
        style="danger"
      />
    </div>
  );
}
