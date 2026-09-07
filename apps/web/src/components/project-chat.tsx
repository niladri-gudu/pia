"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConversationMessages,
  useCreateConversation,
  useSendConversationMessage,
} from "@/hooks/use-projects";

interface ProjectChatProps {
  projectId: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  sources:
    | {
        title: string;
        url: string | null;
        similarity: number;
      }[]
    | null;
  createdAt: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const createConversationMutation = useCreateConversation(projectId);

  const messagesQuery = useConversationMessages(conversationId);

  const sendMessageMutation = useSendConversationMessage(conversationId);

  useEffect(() => {
    createConversationMutation.mutate("Project chat", {
      onSuccess: (conversation) => {
        setConversationId(conversation.id);
      },
    });
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || sendMessageMutation.isPending || !conversationId) {
      return;
    }

    setQuestion("");

    sendMessageMutation.mutate(trimmedQuestion);
  }

  const messages: ChatMessage[] = messagesQuery.data ?? [];

  const isLoading =
    createConversationMutation.isPending ||
    messagesQuery.isLoading ||
    sendMessageMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask about this project</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          {messages.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              Ask a question about the project&apos;s code, issues, pull requests, commits, or
              activity.
            </p>
          )}

          {messages.map((message) => {
            if (message.role === "USER") {
              return (
                <div
                  key={message.id}
                  className="ml-auto max-w-[85%] rounded-lg bg-primary p-4 text-primary-foreground"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </div>
              );
            }

            return (
              <div key={message.id} className="space-y-3">
                <div className="max-w-[90%] rounded-lg bg-muted p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </div>

                {message.sources && message.sources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sources</p>

                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((source, index) =>
                        source.url ? (
                          <a
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                              {source.title || `Source ${index + 1}`}
                            </Badge>
                          </a>
                        ) : (
                          <Badge key={index} variant="outline">
                            {source.title || `Source ${index + 1}`}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sendMessageMutation.isPending && (
            <div className="max-w-[90%] rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          )}

          {(createConversationMutation.isError ||
            messagesQuery.isError ||
            sendMessageMutation.isError) && (
            <p className="text-sm text-destructive">Failed to load the conversation.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask something about this project..."
            disabled={isLoading || !conversationId}
          />

          <Button type="submit" disabled={!question.trim() || isLoading || !conversationId}>
            {sendMessageMutation.isPending ? "Thinking..." : "Ask"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
