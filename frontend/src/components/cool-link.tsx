import React from 'react'
import Link from 'next/link'
import { FaAngleRight } from 'react-icons/fa6';

export default function CoolLink({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="group/link inline-flex items-center gap-2 text-base font-semibold text-slate-100 transition-all hover:text-indigo-400"
    >
      <span className="transition-transform duration-150 group-hover/link:translate-x-1">
        {text}
      </span>
      <FaAngleRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all duration-150 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
    </Link>
  )
}
