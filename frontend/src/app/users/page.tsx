"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: number;
  name: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-light p-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center text-xl text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="mx-auto max-w-6xl">
        {/* Title */}
        <h1 className="mb-8 text-4xl font-bold text-foreground">Users</h1>

        {/* Users Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/users/${user.id}`}
              className="block rounded-lg bg-white p-6 shadow-lg transition hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-sm text-gray-600">User #{user.id}</p>
                </div>
                <div className="text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {users.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center shadow-lg">
            <p className="text-gray-600">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
