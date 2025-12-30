"use client";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import CodeBlock from "../CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-200 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={
          {
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) => {
              const match = /language-(\w+)/.exec(className || "");
              const isInline = !match;

              if (!isInline && match) {
                return (
                  <CodeBlock language={match[1]}>{String(children).replace(/\n$/, "")}</CodeBlock>
                );
              }

              return (
                <code
                  className={`${className || ""} rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-sm text-indigo-300`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
          } as Components
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
