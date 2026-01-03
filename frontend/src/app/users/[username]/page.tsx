"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/utils/api";
import CoolLink from "@/components/cool-link";
import { User } from "@/types/user";
import { FaTrophy, FaCircleCheck, FaUserShield, FaLock } from "react-icons/fa6";

export default function UserDetailPage() {
  const params = useParams();
  const username = params.username;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRes = await apiGet(`/api/users/${username}`);

        if (userRes.status === 401) {
          setIsUnauthorized(true);
          setLoading(false);
          return;
        }

        if (!userRes.ok) {
          throw new Error("User not found");
        }

        const userData = await userRes.json();
        setUser(userData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        let errorMessage = "An unexpected error occurred while loading the user.";
        if (err instanceof Error) {
          if (err.message === "User not found") {
            errorMessage = "User not found.";
          } else if (err.name === "TypeError") {
            errorMessage =
              "Network error: unable to reach the server. Please check your connection and try again.";
          }
        }
        setError(errorMessage);
        setLoading(false);
      }
    };

    if (username) {
      fetchUser();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-8 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center text-xl text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-background px-8 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-12 text-center shadow-xl">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-slate-700 p-6">
                <FaLock className="h-12 w-12 text-slate-400" />
              </div>
            </div>
            <h1 className="mb-4 text-3xl font-bold text-slate-100">Login Required</h1>
            <p className="mb-8 text-lg text-slate-400">
              You must be logged in to view user profiles.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
              >
                Log In
              </Link>
              <Link
                href="/users"
                className="rounded-lg bg-slate-700 px-6 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-600"
              >
                Back to Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background px-8 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 text-center shadow-xl">
            <h1 className="mb-4 text-2xl font-bold text-rose-500">User Not Found</h1>
            <p className="mb-6 text-slate-400">
              {error || "The user you're looking for doesn't exist."}
            </p>
            <CoolLink href="/users" text="Back to Users" direction="left" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <CoolLink href="/users" text="Back to Users" direction="left" />
        </div>

        {/* Unified User Profile Header */}
        <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            {/* User Info */}
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-4xl font-bold text-slate-100">{user.displayName}</h1>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-900/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-200 ring-1 ring-rose-500/50">
                    <FaUserShield /> Admin
                  </span>
                )}
              </div>
              <p className="text-xl text-slate-400">@{user.username}</p>
            </div>

            {/* Stats Row within Header */}
            <div className="flex gap-8">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <FaTrophy className="text-amber-500" /> Rating
                </div>
                <div className="text-3xl font-bold text-amber-400">{user.rating}</div>
              </div>
              <div className="h-auto w-px bg-slate-700"></div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                  <FaCircleCheck className="text-emerald-500" /> Solved
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {user.solvedProblemsCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Solved Problems List */}
        {user.solvedProblems && user.solvedProblems.length > 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-200">
              <FaCircleCheck className="text-emerald-500" /> Solved Problems
            </h2>
            <div className="flex flex-wrap gap-2">
              {user.solvedProblems.map((pid, idx) => (
                <Link
                  key={idx}
                  href={`/problems/${pid}`}
                  className="rounded-lg bg-slate-700/50 px-3 py-1.5 font-mono text-sm font-medium text-emerald-300 ring-1 ring-emerald-900/50 transition hover:bg-slate-700 hover:text-emerald-200"
                >
                  {pid}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-12 text-center shadow-xl">
            <p className="text-lg text-slate-400">No problems solved yet.</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <CoolLink href={`/submissions?user=${user.username}`} text="View All Submissions" />
        </div>
      </div>
    </div>
  );
}
