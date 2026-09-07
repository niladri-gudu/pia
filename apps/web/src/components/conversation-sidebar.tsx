"use client";

import { Plus } from "lucide-react";

import { useProjectConversations } from "@/hooks/use-projects";

interface ConversationSidebarProps {
  projectId: string;
  conversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  projectId,
  conversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const conversationsQuery = useProjectConversations(projectId);

  const conversations = conversationsQuery.data ?? [];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">Conversations</h2>

        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-md p-1.5 hover:bg-muted"
          aria-label="New conversation"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversationsQuery.isLoading ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Loading conversations...
          </p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const isActive = conversation.id === conversationId;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-muted font-medium"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <span className="block truncate">
                    {conversation.title || "Untitled conversation"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}