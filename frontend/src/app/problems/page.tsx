"use client";

import { Problem } from "@/types/problems";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/utils/api";
import { isAdminOrTA } from "@/utils/users";
import ProblemTable from "@/components/ProblemTable";

const ProblemPage: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await apiGet(`/api/problems`);
        const data = await res.json();
        setProblems(data);
      } catch (error) {
        console.error("Failed to fetch problems:", error);
      }
    };

    fetchProblems();
  }, []);

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <ProblemTable showCreateProblem={isAdminOrTA(user)} problems={problems} />
        </div>
      </div>
    </div>
  );
};

export default ProblemPage;
