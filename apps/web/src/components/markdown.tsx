"use client";

import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * Renders an assistant answer as readable document typography. Code blocks
 * stay horizontally scrollable so long lines cannot break the layout.
 */
export function Markdown({
  children,
  className,
}: Omit<ComponentProps<"div">, "children"> & { children: string }) {
  return (
    <div className={cn("text-sm leading-6 break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 last:mb-0 marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 last:mb-0 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => (
            <h2 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-4 mb-2 text-sm font-semibold first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h4>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = /language-/.test(codeClassName ?? "");
            const text = typeof children === "string" ? children : String(children);

            if (isBlock) {
              return (
                <code className={cn("font-mono text-[0.8125rem]", codeClassName)}>{text}</code>
              );
            }

            return (
              <code className="rounded-sm border border-border/70 bg-muted px-1 py-0.5 font-mono text-[0.8125rem]">
                {text}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg border border-border bg-muted p-3 leading-5">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-left text-sm [&_td]:border-border [&_td]:border-t [&_td]:px-2 [&_td]:py-1 [&_th]:border-b [&_th]:px-2 [&_th]:py-1 [&_th]:font-medium">
                {children}
              </table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
