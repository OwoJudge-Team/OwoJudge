"use client";

import { rankings } from "@/constants/rankings";

const RankingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl">
        {/* Title */}
        <h1 className="mb-8 text-4xl font-bold text-foreground">Ranking</h1>

        {/* Rankings Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <table className="w-full text-left">
            <thead className="bg-primary-light text-white">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Points</th>
                <th className="px-6 py-4">Problems Solved</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((ranking) => (
                <tr key={ranking.id} className="transition hover:bg-neutral">
                  <td className="px-6 py-4">{ranking.id}</td>
                  <td className="px-6 py-4">{ranking.name}</td>
                  <td className="px-6 py-4">{ranking.points}</td>
                  <td className="px-6 py-4">{ranking.problemsSolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RankingPage;
