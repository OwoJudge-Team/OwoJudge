"use client";
import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaCopy, FaCheck } from "react-icons/fa6";

interface CodeBlockProps {
  language: string;
  children: string;
}

export default function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/code relative my-6 overflow-hidden rounded-xl border border-slate-700/60 bg-[#282c34] shadow-lg transition-all hover:border-slate-600 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-900/40 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Window controls decoration */}
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500/20 group-hover/code:bg-rose-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/20 group-hover/code:bg-amber-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 group-hover/code:bg-emerald-500" />
          </div>
          <span className="ml-2 text-xs font-bold uppercase tracking-wider text-slate-400/80">
            {language || "text"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="relative inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-slate-100 focus:outline-none"
          aria-label="Copy code"
        >
          {copied ? (
            <FaCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <FaCopy className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneDark as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          PreTag="div"
          wrapLines={true}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            textAlign: "right",
            color: "#4b5563", // slate-600
            userSelect: "none",
          }}
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            backgroundColor: "transparent", // Let parent bg show through
            fontSize: "0.95rem",
            lineHeight: "1.6",
          }}
          codeTagProps={{
            style: {
              fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
              fontVariantLigatures: "none",
            },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
