"use client";
import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import CodeBlock from "../CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

type WebEmbedProps = {
  src: string;
  title: string;
};

type PdfEmbedProps = {
  href: string;
  title: string;
};

const resolveWebEmbedSrc = (src: string): string => {
  try {
    const parsed = new URL(src);
    const innerUrl = parsed.searchParams.get("url");

    // Special-case predoc viewer: its frontend makes cross-origin XHRs that fail in embedded mode.
    // If it wraps a file URL, render the file directly through our PDF proxy.
    if (parsed.hostname === "predoc.dlc.ntu.edu.tw" && innerUrl) {
      return `/api/pdf-proxy?url=${encodeURIComponent(innerUrl)}`;
    }
  } catch {
    return `/api/web-proxy?url=${encodeURIComponent(src)}`;
  }

  return `/api/web-proxy?url=${encodeURIComponent(src)}`;
};

const WebEmbed: React.FC<WebEmbedProps> = ({ src, title }) => {
  const proxiedSrc = resolveWebEmbedSrc(src);
  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/60">
      <iframe
        src={proxiedSrc}
        className="h-[72vh] min-h-[680px] w-full bg-slate-950 lg:min-h-[820px]"
        title={title}
      />
    </div>
  );
};

const PdfEmbed: React.FC<PdfEmbedProps> = ({ href, title }) => {
  const viewerSrc = toPdfViewerSrc(href);
  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/60">
      <iframe
        src={viewerSrc}
        className="h-[72vh] min-h-[680px] w-full bg-slate-950 lg:min-h-[820px]"
        title={title}
      />
      <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-indigo-300 hover:text-indigo-200"
        >
          Open PDF in new tab
        </a>
      </div>
    </div>
  );
};

const isPdfLink = (href?: string): boolean => {
  if (!href) {
    return false;
  }

  try {
    const url = new URL(href, "http://localhost");
    return url.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
};

const toPdfViewerSrc = (href?: string): string | undefined => {
  if (!href) {
    return undefined;
  }

  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return `/api/pdf-proxy?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {
    return href;
  }

  return href;
};

const escapeHtmlAttr = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const replaceIframeSyntax = (text: string): string => {
  return text.replace(/\{\{iframe:(https?:\/\/[^\s}]+)\}\}/g, (full, rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return `<web-embed src="${escapeHtmlAttr(parsed.toString())}"></web-embed>`;
      }
      return full;
    } catch {
      return full;
    }
  });
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processedContent = (content || "")
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => `$$${p1.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, p1) => `$${p1.trim()}$`);
  const contentWithEmbeds = replaceIframeSyntax(processedContent);

  return (
    <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-slate-100 prose-p:text-slate-300 prose-strong:text-slate-200 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={
          {
            pre: ({ children }) => {
              const childArray = React.Children.toArray(children);
              const codeElement = childArray.find((child) => React.isValidElement(child)) as
                | React.ReactElement<{ className?: string; children?: React.ReactNode }>
                | undefined;

              if (codeElement) {
                const { className, children: codeContent } = codeElement.props;
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "text";

                return (
                  <CodeBlock language={language}>
                    {String(codeContent).replace(/\n$/, "")}
                  </CodeBlock>
                );
              }

              return <>{children}</>;
            },
            code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<"code">) => {
              return (
                <code
                  className={`${className || ""} rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-sm text-indigo-300`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => {
              const childArray = React.Children.toArray(children);
              if (
                childArray.length === 1 &&
                React.isValidElement(childArray[0]) &&
                childArray[0].type === PdfEmbed
              ) {
                return <div>{children}</div>;
              }
              return <p {...props}>{children}</p>;
            },
            "web-embed": ({ src }: { src?: string }) => {
              if (!src) {
                return null;
              }
              return <WebEmbed src={src} title="Embedded Web Content" />;
            },
            a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
              if (isPdfLink(href)) {
                return (
                  <PdfEmbed
                    href={href}
                    title={typeof children === "string" ? children : "PDF Viewer"}
                  />
                );
              }

              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 underline decoration-indigo-500/60 underline-offset-2 hover:text-indigo-200"
                  {...props}
                >
                  {children}
                </a>
              );
            },
          } as Components
        }
      >
        {contentWithEmbeds}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
