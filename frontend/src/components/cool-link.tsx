import React from "react";
import Link from "next/link";
import { FaAngleRight, FaAngleLeft } from "react-icons/fa6";

export default function CoolLink({
  href,
  text,
  direction = "right",
}: {
  href: string;
  text: string;
  direction?: "left" | "right";
}) {
  const isLeft = direction === "left";

  return (
    <Link
      href={href}
      className="group/link inline-flex items-center gap-2 text-base font-semibold text-slate-100 transition-all hover:text-indigo-400"
    >
      {isLeft && (
        <FaAngleLeft className="h-4 w-4 translate-x-2 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
      )}
      <span
        className={`transition-transform duration-150 text-pretty ${
          isLeft ? "group-hover/link:-translate-x-1" : "group-hover/link:translate-x-1"
        }`}
      >
        {text}
      </span>
      {!isLeft && (
        <FaAngleRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
      )}
    </Link>
  );
}
