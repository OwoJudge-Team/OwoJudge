"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCode, FaFile, FaTrophy, FaUser } from "react-icons/fa6";

const navItems = [
  { name: "Problems", href: "/problems", icon: FaCode },
  { name: "Submissions", href: "/submissions", icon: FaFile },
  { name: "Contests", href: "/contests", icon: FaTrophy },
];

const Header: React.FC = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/60 shadow-xl backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center px-8 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-slate-100 transition-all duration-150 hover:text-indigo-400"
        >
          OwoJudge
        </Link>

        {/* Navigation */}
        <nav className="ml-12 flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group/nav inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-slate-700/80 text-slate-100"
                    : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Login Button */}
        <div className="ml-auto">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-800/80 px-5 py-2 text-sm font-bold text-indigo-100 shadow-sm transition-all duration-150 hover:bg-indigo-700/80"
          >
            <FaUser className="h-4 w-4" />
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
