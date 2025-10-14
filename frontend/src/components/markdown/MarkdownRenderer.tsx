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

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={
          {
            pre: (props) => (
              <pre className="overflow-x-auto rounded bg-gray-800 p-3 text-gray-100" {...props} />
            ),
            code: ({
              children,
              className,
              ...rest
            }: {
              children?: React.ReactNode;
              className?: string;
            }) => (
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
