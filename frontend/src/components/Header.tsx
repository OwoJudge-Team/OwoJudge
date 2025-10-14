"use client";

import Link from "next/link";

const navItems = [
  { name: "Problems", href: "/problems" },
  { name: "Submissions", href: "/submissions" },
  { name: "Contests", href: "/contests" },
  { name: "Ranking", href: "/ranking" },
  { name: "About", href: "/about" },
];

const Header: React.FC = () => {
  return (
    <header className="bg-primary p-4 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center">
        {/* Logo */}
        <Link
          href="/"
          className="transform text-3xl font-bold text-white transition duration-300 hover:scale-105 hover:text-gray-200"
        >
          OwoJudge
        </Link>

        {/* Navigation + Login */}
        <div className="ml-auto flex items-center space-x-8">
          <nav className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-lg text-white transition duration-300 hover:text-gray-200"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="rounded-full bg-white px-5 py-2 font-semibold text-primary-dark shadow transition duration-300 hover:bg-gray-200"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
