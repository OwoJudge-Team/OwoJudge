"use client";
import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nord } from "react-syntax-highlighter/dist/esm/styles/prism";
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
    <div className="group/code bg-code relative my-6 overflow-hidden rounded-lg border border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded bg-slate-700/50 px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600 hover:text-white focus:outline-none"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <FaCheck className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <FaCopy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={nord}
          PreTag="div"
          wrapLines={true}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            textAlign: "right",
            color: "#4b5563", // slate-600
            userSelect: "none",
          }}
          customStyle={{
            margin: 0,
            padding: "0.7rem",
            backgroundColor: "transparent", // Let parent bg show through
            fontSize: "1rem",
            lineHeight: "1.5",
          }}
          codeTagProps={{
            style: {
              // fontFamily: '"Fira Mono", "JetBrains Mono", "Consolas", monospace',
              fontVariantLigatures: "none",
              fontWeight: 400,
            },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
