"use client";

import Link from "next/link";
import { problems } from "@/constants/problems";

const ProblemPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl">
        {/* Title */}
        <h1 className="mb-8 text-4xl font-bold text-foreground">Problems</h1>

        {/* Problems Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-primary-light text-white">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Difficulty</th>
                <th className="px-6 py-4">AC Ratio (User)</th>
                <th className="px-6 py-4">AC Ratio (Submission)</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id} className="transition hover:bg-neutral">
                  <td className="px-6 py-4">{problem.id}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/problems/${problem.id}`}
                      className="font-semibold text-primary-dark transition hover:underline"
                    >
                      {problem.title}
                    </Link>
                  </td>
                  <td className={`px-6 py-4 ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </td>
                  <td className="px-6 py-4">{problem.submissions}</td>
                  <td className="px-6 py-4">{problem.accuracy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy":
      return "text-green-600";
    case "Medium":
      return "text-yellow-500";
    case "Hard":
      return "text-red-600";
    default:
      return "";
  }
};

export default ProblemPage;
