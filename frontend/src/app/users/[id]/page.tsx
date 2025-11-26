"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface UserData {
  id: number;
  name: string;
  username: string;
  email: string;
  bio: string;
  points: number;
  problemsSolved: number;
  rank: number;
  joinDate: string;
  submissions: number;
  acceptedSubmissions: number;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("User not found");
        }
        return res.json();
      })
      .then((data) => {
        setUserData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light p-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center text-xl text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-neutral-light p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg bg-white p-8 text-center shadow-lg">
            <h1 className="mb-4 text-2xl font-bold text-red-600">User Not Found</h1>
            <p className="mb-6 text-gray-600">
              {error || "The user you're looking for doesn't exist."}
            </p>
            <Link href="/users" className="text-primary hover:underline">
              ← Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const acceptanceRate =
    userData.submissions > 0
      ? ((userData.acceptedSubmissions / userData.submissions) * 100).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-5xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/users" className="text-primary hover:underline">
            ← Back to Users
          </Link>
        </div>

        {/* User Profile Header */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-foreground">{userData.name}</h1>
              <p className="mb-4 text-xl text-gray-600">@{userData.username}</p>
              {userData.bio && <p className="mb-4 text-gray-700">{userData.bio}</p>}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>📧 {userData.email}</span>
                <span>📅 Joined {new Date(userData.joinDate).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2 text-3xl font-bold text-primary">#{userData.rank}</div>
              <div className="text-sm text-gray-600">Global Rank</div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Points Card */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-sm text-gray-600">Total Points</div>
            <div className="text-3xl font-bold text-primary">{userData.points}</div>
          </div>

          {/* Problems Solved Card */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-sm text-gray-600">Problems Solved</div>
            <div className="text-3xl font-bold text-green-600">{userData.problemsSolved}</div>
          </div>

          {/* Total Submissions Card */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-sm text-gray-600">Total Submissions</div>
            <div className="text-3xl font-bold text-blue-600">{userData.submissions}</div>
          </div>

          {/* Acceptance Rate Card */}
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-2 text-sm text-gray-600">Acceptance Rate</div>
            <div className="text-3xl font-bold text-purple-600">{acceptanceRate}%</div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-foreground">Detailed Statistics</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex justify-between border-b py-3">
              <span className="text-gray-600">Total Submissions:</span>
              <span className="font-semibold">{userData.submissions}</span>
            </div>
            <div className="flex justify-between border-b py-3">
              <span className="text-gray-600">Accepted Submissions:</span>
              <span className="font-semibold text-green-600">{userData.acceptedSubmissions}</span>
            </div>
            <div className="flex justify-between border-b py-3">
              <span className="text-gray-600">Failed Submissions:</span>
              <span className="font-semibold text-red-600">
                {userData.submissions - userData.acceptedSubmissions}
              </span>
            </div>
            <div className="flex justify-between border-b py-3">
              <span className="text-gray-600">Success Rate:</span>
              <span className="font-semibold">{acceptanceRate}%</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={`/submissions?user=${userData.username}`}
            className="hover:bg-primary/90 rounded-lg bg-primary px-6 py-3 text-white transition"
          >
            View Submissions
          </Link>
          <Link
            href="/ranking"
            className="hover:bg-neutral/80 rounded-lg bg-neutral px-6 py-3 text-black transition"
          >
            View Rankings
          </Link>
        </div>
      </div>
    </div>
  );
}
