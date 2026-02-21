"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaCode, FaFile, FaTrophy, FaBars, FaX, FaUser } from "react-icons/fa6";
import UserMenu, { UserInfo, UserMenuItems } from "./UserMenu";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { name: "Problems", href: "/problems", icon: FaCode },
  { name: "Submissions", href: "/submissions", icon: FaFile },
  { name: "Homeworks", href: "/homeworks", icon: FaTrophy },
];

const NavLinks = ({ onClick, pathname }: { onClick: () => void; pathname: string }) => {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`group/nav inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-base font-semibold transition-all duration-150 ${
              isActive
                ? "bg-slate-700/80 text-slate-100"
                : "text-slate-300 hover:bg-slate-700/60 hover:text-slate-100"
            }`}
            onClick={onClick}
          >
            <Icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </>
  );
};

const Header: React.FC = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between border-b border-slate-700/50 bg-slate-900/60 px-4 py-4 shadow-xl backdrop-blur-lg">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMenu}
          className="text-3xl font-bold text-slate-100 transition-all duration-150 hover:text-indigo-400"
        >
          DSA Judge+
        </Link>

        {user ? (
          <>
            {/* Desktop nav links and user menu */}
            <nav className="ml-12 hidden gap-1 lg:flex">
              <NavLinks onClick={closeMenu} pathname={pathname} />
            </nav>

            <div className="ml-auto hidden lg:block">
              <UserMenu />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ml-auto flex items-center justify-center p-2 text-slate-300 transition-colors hover:text-slate-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FaX className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-indigo-600 px-6 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-150 hover:bg-indigo-500 hover:shadow-indigo-500/40"
          >
            <FaUser className="h-5 w-5" />
            Login
          </Link>
        )}
      </div>

      {/* Mobile menu dropdown, need to be outside to avoid the backdrop clashing with the one from navbar */}
      {user && (
        <div
          className={`absolute left-0 right-0 top-full border-t border-slate-700/50 bg-slate-900/60 shadow-xl backdrop-blur-lg transition-all duration-300 ease-out lg:hidden ${
            isMenuOpen ? "pointer-events-auto" : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <UserInfo user={user} />
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            <NavLinks onClick={closeMenu} pathname={pathname} />
          </nav>
          <hr className="w-full border border-slate-700/50" />
          <UserMenuItems username={user.username} onMenuItemClick={closeMenu} />
        </div>
      )}
    </header>
  );
};

export default Header;
