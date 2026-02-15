"use client";

import { Problem } from "@/types/problems";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost } from "@/utils/api";
import Modal from "@/components/Modal";
import { useState, useRef, useEffect } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { LuLoaderCircle } from "react-icons/lu";
import DateTimePicker from "@/components/DateTimePicker";
import { isAdminOrTA } from "@/utils/users";

interface ProblemProps {
  serialNumber: number;
  score: number;
}

interface CreateContestFormData {
  title: string;
  description: string;
  problems: ProblemProps[];
  startTime: string;
  endTime: string;
}

const CreateContestPage = () => {
  const [problems, setProblems] = useState<Array<Problem>>([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleProblemToggle = (problemId: number) => {
    setSelectedProblems((prev) =>
      prev.includes(problemId) ? prev.filter((id) => id !== problemId) : [...prev, problemId]
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    const fetchProblems = async () => {
      try {
        const res = await apiGet("/api/problems");
        const data = await res.json();
        setProblems(data);
      } catch (error) {
        console.error("Failed to fetch problems:", error);
      }
    };

    fetchProblems();

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData: CreateContestFormData = {
        title,
        description,
        problems: selectedProblems.map((id) => {
          const problem = problems.find((p) => p.serialNumber === id);
          return {
            serialNumber: id,
            score: problem ? (problem.fullScore ?? 0) : 0,
          };
        }),
        startTime: startTime,
        endTime: deadline,
      };

      const res = await apiPost("/api/contests", formData, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error("Failed to create contest");
      }
      setModalMessage(`Contest created successfully!`);
    } catch {
      setModalMessage("An error occurred while creating the contest.");
    } finally {
      setLoading(false);
      setIsModalOpen(true);
      setSelectedProblems([]);
      setStartTime("");
      setDeadline("");
    }
  };

  if (!user || !isAdminOrTA(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-slate-300">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">Create New Homework</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <label htmlFor="title" className="mb-2 block text-lg font-semibold text-slate-300">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <label
              htmlFor="description"
              className="mb-2 block text-lg font-semibold text-slate-300"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-sm">
            <label className="mb-4 block text-lg font-semibold text-slate-300">
              Select Problems
            </label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full rounded border border-slate-600 bg-slate-700 px-4 py-3 text-left text-slate-100 hover:bg-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedProblems.length === 0 ? (
                      <span className="text-slate-400">Select problems...</span>
                    ) : (
                      selectedProblems.map((problemId) => {
                        const problem = problems.find((p) => p.serialNumber === problemId);
                        if (!problem) return null;
                        return (
                          <span
                            key={problemId}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-sm text-slate-100"
                          >
                            {problem.title}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProblemToggle(problemId);
                              }}
                              className="cursor-pointer rounded-full hover:opacity-80"
                            >
                              ✕
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>
                  <IoIosArrowDown
                    className={`min-w-5 text-lg transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <div className="no-scrollbar scrollbar-hide absolute left-0 right-0 top-full z-10 mt-2 max-h-64 overflow-y-auto rounded border border-slate-600 bg-slate-700 shadow-lg">
                  {problems.map((problem) => (
                    <label
                      key={problem.serialNumber}
                      className="flex cursor-pointer items-center gap-3 border-b border-slate-600 px-4 py-3 hover:bg-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProblems.includes(problem.serialNumber || 0)}
                        onChange={() => handleProblemToggle(problem.serialNumber || 0)}
                        className="h-4 w-4 accent-indigo-500 hover:cursor-pointer"
                      />
                      <div className="flex flex-1 items-center justify-between">
                        <span className="text-slate-100">{problem.title}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-row gap-6">
            <div className="w-full rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <label
                htmlFor="startTime"
                className="mb-2 block text-lg font-semibold text-slate-300"
              >
                Start Time
              </label>
              <DateTimePicker value={startTime} onChange={(value: string) => setStartTime(value)} />
            </div>

            <div className="w-full rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-sm">
              <label htmlFor="deadline" className="mb-2 block text-lg font-semibold text-slate-300">
                Deadline
              </label>
              <DateTimePicker value={deadline} onChange={(value: string) => setDeadline(value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={selectedProblems.length === 0 || !startTime || !deadline}
              className="flex w-full justify-center rounded bg-indigo-600 px-6 py-3 font-semibold text-slate-100 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LuLoaderCircle className="animate-spin text-2xl text-slate-100" />
              ) : (
                "Create Homework"
              )}
            </button>
          </div>
        </form>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} message={modalMessage} />
      </div>
    </div>
  );
};

export default CreateContestPage;
