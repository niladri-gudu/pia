"use client";

import { ExternalLink, History } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/lib/api";

interface ChatMessageProps {
  message: ConversationMessage;
}

const MEMORY_TYPE_LABELS: Record<string, string> = {
  FACT: "Fact",
  PREFERENCE: "Preference",
  DECISION: "Decision",
  CONTEXT: "Context",
};

function UserMessage({ message }: { message: ConversationMessage }) {
  return (
    <div className="flex justify-end" role="listitem">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground sm:max-w-[75%]">
        <p className="text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ConversationMessage }) {
  const memories = message.memories ?? [];
  const sources = message.sources ?? [];

  return (
    <div className="space-y-3" role="listitem">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-md bg-primary/10 text-[0.625rem] font-bold text-primary">
          PIA
        </span>

        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.createdAt)}
        </span>
      </div>

      <Markdown>{message.content}</Markdown>

      {memories.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            Project memory
          </p>

          <ul className="mt-1.5 space-y-1">
            {memories.map((memory, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium text-muted-foreground">
                  {MEMORY_TYPE_LABELS[memory.type] ?? memory.type}:
                </span>{" "}
                {memory.content}
              </li>
            ))}
          </ul>

          <p className="mt-1.5 text-xs text-muted-foreground/80">
            Recalled from previous conversations — not a retrieved source.
          </p>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Sources</p>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sources.map((source, index) => {
              const label = (
                <>
                  <span className="tabular font-mono text-[0.6875rem] text-muted-foreground">
                    [{index + 1}]
                  </span>
                  <span className="max-w-56 truncate">{source.title || `Source ${index + 1}`}</span>
                </>
              );

              const className =
                "inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs transition-colors";

              return source.url ? (
                <a
                  key={`${source.url}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open source ${index + 1}: ${source.title || "untitled"}`}
                  className={cn(className, "hover:border-primary/40 hover:bg-accent")}
                >
                  {label}
                  <ExternalLink className="size-3 text-muted-foreground" aria-hidden />
                </a>
              ) : (
                <span key={index} className={className}>
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  return message.role === "USER" ? <UserMessage message={message} /> : <AssistantMessage message={message} />;
}

/**
 * Pending indicator shown while the agent researches the question.
 * Rendered inside an aria-live region by the chat container.
 */
export function PendingMessage() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="grid size-5 place-items-center rounded-md bg-primary/10 text-[0.625rem] font-bold text-primary">
        PIA
      </span>

      <span aria-hidden className="flex gap-1">
        <span className="size-1.5 rounded-full bg-muted-foreground/60 pending-dot [animation-delay:0ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 pending-dot [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 pending-dot [animation-delay:300ms]" />
      </span>

      <span>Researching the project…</span>
    </div>
  );
}
