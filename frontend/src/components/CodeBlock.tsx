"use client";
import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
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
    <div className="group/code relative my-4">
      {/* Language label and copy button */}
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-slate-700 bg-slate-800/80 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-700/50 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-150 hover:bg-slate-700 hover:text-slate-100"
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
      <div className="overflow-hidden rounded-b-lg border border-slate-700 bg-slate-950">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          PreTag="div"
          wrapLines={true}
          showLineNumbers={false}
          customStyle={{
            backgroundColor: "rgb(2 6 23)",
            padding: "1.25rem",
            margin: 0,
            borderRadius: 0,
            fontSize: "0.875rem",
            lineHeight: "1.5",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              backgroundColor: "transparent",
            },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
