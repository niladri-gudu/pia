"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage, PendingMessage } from "@/components/chat-message";
import { ConversationDrawer, ConversationRail } from "@/components/conversation-sidebar";
import {
  useConversationMessages,
  useCreateConversation,
  useProjectConversations,
  useSendConversationMessage,
} from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

interface ProjectChatProps {
  projectId: string;
}

/**
 * Suggested opening questions. Only questions the application's data can
 * actually support (recent activity, commits, issues, PRs from GitHub sync).
 */
const SUGGESTED_QUESTIONS = [
  "What changed recently?",
  "What was recently merged?",
  "Summarize the latest commits.",
  "What open issues exist?",
];

const NEW_CONVERSATION_TITLE = "Project chat";

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [question, setQuestion] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [lastSentQuestion, setLastSentQuestion] = useState<string | null>(null);
  const creationStarted = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useProjectConversations(projectId);
  const createConversationMutation = useCreateConversation(projectId);

  // The active conversation is the user's explicit selection, falling back
  // to the most recent conversation.
  const latestConversationId = conversationsQuery.data?.[0]?.id ?? null;
  const conversationId = selectedConversationId ?? latestConversationId;

  const messagesQuery = useConversationMessages(conversationId);
  const sendMessageMutation = useSendConversationMessage(conversationId);

  // First visit with no conversations: create the initial one. The id is
  // set in the mutation callback, never synchronously inside the effect.
  useEffect(() => {
    if (creationStarted.current || !conversationsQuery.data) {
      return;
    }

    if (conversationsQuery.data.length > 0) {
      return;
    }

    creationStarted.current = true;

    createConversationMutation.mutate(NEW_CONVERSATION_TITLE, {
      onSuccess: (conversation) => {
        setSelectedConversationId(conversation.id);
      },
    });
  }, [conversationsQuery.data, createConversationMutation]);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    const container = transcriptRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messagesQuery.data, sendMessageMutation.isPending]);

  function sendMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed || sendMessageMutation.isPending || !conversationId) {
      return;
    }

    setQuestion("");
    setLastSentQuestion(trimmed);
    sendMessageMutation.mutate(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(question);
  }

  function handleRetry() {
    if (lastSentQuestion) {
      sendMessage(lastSentQuestion);
    }
  }

  function handleNewConversation() {
    if (createConversationMutation.isPending) {
      return;
    }

    createConversationMutation.mutate(NEW_CONVERSATION_TITLE, {
      onSuccess: (conversation) => {
        setSelectedConversationId(conversation.id);
        setQuestion("");
      },
    });
  }

  const messages = messagesQuery.data ?? [];
  const isAwaitingAnswer = sendMessageMutation.isPending;
  const isBusy =
    createConversationMutation.isPending || messagesQuery.isLoading || isAwaitingAnswer;
  const isComposerDisabled = isBusy || !conversationId;
  const hasMessages = messages.length > 0 || isAwaitingAnswer;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <ConversationRail
        projectId={projectId}
        activeConversationId={conversationId}
        onSelectConversation={setSelectedConversationId}
        onNewConversation={handleNewConversation}
        isCreating={createConversationMutation.isPending}
      />

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Project chat">
        <header className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ConversationDrawer
              projectId={projectId}
              activeConversationId={conversationId}
              onSelectConversation={setSelectedConversationId}
              onNewConversation={handleNewConversation}
              isCreating={createConversationMutation.isPending}
            />

            <h2 className="text-sm font-semibold">Ask about this project</h2>
          </div>

          <p className="hidden text-xs text-muted-foreground sm:block">
            Answers are grounded in synced project data and cite their sources.
          </p>
        </header>

        <div
          ref={transcriptRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-6"
          role="log"
          aria-label="Conversation transcript"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {!hasMessages && !isBusy && (
              <div className="pt-6">
                <h3 className="text-lg font-semibold tracking-tight">
                  Ask anything about this project
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Questions are answered from synced issues, pull requests and commits, with
                  citations back to the source.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      disabled={isComposerDisabled}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6" role="list">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {isAwaitingAnswer && <PendingMessage />}
            </div>

            {(createConversationMutation.isError || messagesQuery.isError) && (
              <p role="status" className="text-sm text-destructive">
                We couldn&apos;t load this conversation right now. Please try again.
              </p>
            )}

            {sendMessageMutation.isError && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
              >
                <p className="text-sm text-destructive">
                  Your question couldn&apos;t be answered right now. Please try again.
                </p>

                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="size-3.5" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="relative flex-1">
              <span className="sr-only" id="question-label">
                Your question
              </span>

              <Input
                aria-labelledby="question-label"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask something about this project…"
                disabled={isComposerDisabled}
                className="h-10 pr-10"
              />

              <Button
                type="submit"
                size="icon"
                aria-label="Send question"
                disabled={!question.trim() || isComposerDisabled}
                className={cn("absolute inset-y-1 right-1 size-8")}
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
