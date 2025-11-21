"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FaUser, FaGear, FaArrowRightFromBracket, FaChevronDown, FaStar } from "react-icons/fa6";

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push("/");
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-indigo-600 px-6 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 hover:bg-indigo-500 hover:shadow-indigo-500/40"
      >
        <FaUser className="h-5 w-5" />
        Login
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-[42px] items-center gap-3 rounded-lg bg-slate-700/60 px-4 text-base font-semibold text-slate-100 transition-all duration-150 hover:bg-slate-700/50"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
            <FaUser className="h-3.5 w-3.5 text-white" />
          </div>
          <span>{user.displayName}</span>
        </div>
        <FaChevronDown
          className={`h-4 w-4 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
          {/* User Info */}
          <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
            <p className="text-base font-bold text-slate-100">{user.displayName}</p>
            <p className="text-sm text-slate-400">@{user.username}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800/50 px-3 py-1.5 text-sm font-medium text-amber-200">
                <FaStar className="h-3.5 w-3.5" />
                {user.rating}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800/50 px-3 py-1.5 text-sm font-medium text-emerald-200">
                <span className="text-xs font-semibold">SOLVED</span>
                {user.solvedProblem}
              </span>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-800/50 px-3 py-1.5 text-sm font-medium text-indigo-200">
                  <span className="text-xs font-semibold">ADMIN</span>
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="divide-y divide-slate-700/50">
            <Link
              href={`/users/${user.id}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-base font-semibold text-slate-100 transition-all duration-150 hover:bg-slate-700/50 hover:text-indigo-400"
            >
              <FaUser className="h-4 w-4" />
              View Profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-6 py-4 text-base font-semibold text-slate-100 transition-all duration-150 hover:bg-slate-700/50 hover:text-indigo-400"
            >
              <FaGear className="h-4 w-4" />
              Settings
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-6 py-4 text-base font-semibold text-rose-400 transition-all duration-150 hover:bg-slate-700/50 hover:text-rose-300"
            >
              <FaArrowRightFromBracket className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
