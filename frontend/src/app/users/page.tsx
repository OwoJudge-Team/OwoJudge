"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import CoolLink from "@/components/cool-link";

interface User {
  _id: string;
  username: string;
  displayName: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiGet("/api/users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center text-xl text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  #
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {users.map((user, index) => (
                <tr
                  key={user.username}
                  className="group transition-all duration-150 hover:bg-slate-700/50"
                >
                  <td className="px-6 py-4">
                    <div className="text-lg font-bold text-slate-400">
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <CoolLink href={`/users/${user.username}`} text={user.displayName} />
                      <span className="text-xs text-slate-500">@{user.username}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="mt-6 text-center text-slate-500">
            <p>No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
