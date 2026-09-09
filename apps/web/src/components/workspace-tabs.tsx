"use client";

import { MessageSquare, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkspaceTab = "chat" | "search";

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}

const TABS: Array<{ id: WorkspaceTab; label: string; icon: typeof MessageSquare }> = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "search", label: "Search", icon: Search },
];

/**
 * Accessible tab bar shared by the chat and search experiences.
 */
export function ChatTab({ activeTab, onChange }: WorkspaceTabsProps) {
  return (
    <div role="tablist" aria-label="Project workspace" className="flex gap-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

