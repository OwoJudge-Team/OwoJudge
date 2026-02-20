"use client";

import Link from "next/link";
import { FaCode, FaTrophy, FaRocket } from "react-icons/fa6";

const HomePage: React.FC = () => {
  return (
    <div className="bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/20 shadow-xl">
            <FaCode className="h-10 w-10 text-indigo-400" />
          </div>
          <h1 className="mb-6 text-5xl font-bold text-slate-100">DSA Judge+</h1>
          <p className="mb-8 text-xl text-slate-300">
            Solve problems, compete, and improve your coding skills
          </p>
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-8 py-3 text-base font-bold text-white transition-all duration-150 hover:bg-indigo-500"
          >
            Start Solving
          </Link>
        </section>

        {/* Features Section */}
        <section className="grid gap-6 py-12 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl transition-all duration-150 hover:bg-slate-700/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-800/50">
              <FaCode className="h-6 w-6 text-blue-200" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-100">Practice Problems</h3>
            <p className="mb-4 text-sm text-slate-300">
              Solve algorithmic challenges from beginner to advanced levels
            </p>
            <Link
              href="/problems"
              className="text-sm font-semibold text-indigo-400 transition-all duration-150 hover:text-indigo-300"
            >
              Browse Problems →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl transition-all duration-150 hover:bg-slate-700/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-800/50">
              <FaTrophy className="h-6 w-6 text-amber-200" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-100">Track Progress</h3>
            <p className="mb-4 text-sm text-slate-300">
              Monitor your submissions and see your improvement over time
            </p>
            <Link
              href="/submissions"
              className="text-sm font-semibold text-indigo-400 transition-all duration-150 hover:text-indigo-300"
            >
              View Submissions →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl transition-all duration-150 hover:bg-slate-700/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-800/50">
              <FaRocket className="h-6 w-6 text-emerald-200" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-100">Compete</h3>
            <p className="mb-4 text-sm text-slate-300">
              Challenge yourself in contests and climb the rankings
            </p>
            <Link
              href="/users"
              className="text-sm font-semibold text-indigo-400 transition-all duration-150 hover:text-indigo-300"
            >
              View Users →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
