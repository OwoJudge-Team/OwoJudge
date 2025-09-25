"use client";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
}

// Basic renderer for now; can extend with syntax highlighting later
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={
          {
            pre: (props) => <pre className="bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto" {...props} />,
            code: ({ children, className, ...rest }: { children?: React.ReactNode; className?: string }) => (
              <code className={`font-mono text-sm ${className || ""}`} {...rest}>
                {children}
              </code>
            ),
          } as Components
        }
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
