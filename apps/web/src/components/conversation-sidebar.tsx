"use client";

import { useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { MessageSquare, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/states";
import { useProjectConversations } from "@/hooks/use-projects";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  projectId: string;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

function ConversationList({
  projectId,
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const conversationsQuery = useProjectConversations(projectId);

  const conversations = conversationsQuery.data ?? [];

  if (conversationsQuery.isLoading) {
    return (
      <div className="space-y-2 p-2">
        <LoadingSkeleton className="h-9 w-full" />
        <LoadingSkeleton className="h-9 w-full" />
        <LoadingSkeleton className="h-9 w-4/5" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">
        No conversations yet. Ask your first question about this project.
      </p>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      {conversations.map((conversation) => {
        const isActive = conversation.id === activeConversationId;

        return (
          <button
            key={conversation.id}
            type="button"
            aria-current={isActive || undefined}
            onClick={() => onSelectConversation(conversation.id)}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-muted/70",
            )}
          >
            <span className="block truncate text-sm font-medium">
              {conversation.title || "Untitled conversation"}
            </span>

            <span className="mt-0.5 block text-xs text-muted-foreground tabular">
              {formatRelativeTime(conversation.updatedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ConversationRailProps {
  projectId: string;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  isCreating: boolean;
}

/**
 * Desktop conversation rail (hidden below lg) with a drawer twin for
 * smaller screens. Both share the same list.
 */
export function ConversationRail(props: ConversationRailProps) {
  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <h2 className="text-sm font-semibold">Conversations</h2>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={props.onNewConversation}
          disabled={props.isCreating}
          aria-label="New conversation"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
        <ConversationList
          projectId={props.projectId}
          activeConversationId={props.activeConversationId}
          onSelectConversation={props.onSelectConversation}
        />
      </nav>
    </aside>
  );
}

/**
 * Mobile conversation drawer, opened from the chat header below lg.
 */
export function ConversationDrawer(props: ConversationRailProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  function selectAndClose(conversationId: string) {
    props.onSelectConversation(conversationId);
    setOpen(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          aria-label="Open conversation history"
        >
          <MessageSquare className="size-4" />
          <span className="text-xs">History</span>
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Conversations
            </DialogPrimitive.Title>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={props.onNewConversation}
                disabled={props.isCreating}
              >
                <Plus className="size-4" />
                <span className="text-xs">New</span>
              </Button>

              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon-sm" ref={closeRef} aria-label="Close conversations">
                  <X className="size-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
            <ConversationList
              projectId={props.projectId}
              activeConversationId={props.activeConversationId}
              onSelectConversation={selectAndClose}
            />
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
