"use client";

import { useState } from "react";
import { useInboxConversations } from "@/hooks/useInboxConversations";
import { useInboxStore } from "@/stores/inboxStore";
import { InboxFilterTabs } from "./InboxFilterTabs";
import { InboxChannelBadge } from "./InboxChannelBadge";
import { formatRelativeTime } from "@apex-ia/utils";
import type { InboxFiltersType } from "@apex-ia/types";
import { Search, Loader2 } from "lucide-react";

type InboxConversationListProps = {
  onSelectConversation: (id: string) => void;
};

export function InboxConversationList({
  onSelectConversation,
}: InboxConversationListProps) {
  const { filters, setFilters, selectedConversationId } = useInboxStore();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading, isError } = useInboxConversations(filters);

  const filtered = (conversations ?? []).filter((c) => {
    if (!searchQuery) return true;
    return c.id.includes(searchQuery) || c.channel.includes(searchQuery.toLowerCase());
  });

  return (
    <aside
      className="w-80 flex-shrink-0 bg-[#1F2937] border-r border-[#374151] flex flex-col h-full"
      aria-label="Lista de conversaciones"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-lg font-semibold text-white mb-3">Inbox</h1>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar conversación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111827] border border-[#374151] rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            aria-label="Buscar conversaciones"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex-shrink-0">
        <InboxFilterTabs
          activeTab={filters.tab}
          onTabChange={(tab) => setFilters({ tab })}
        />
      </div>

      {/* Conversation list */}
      <div
        role="list"
        id={`tabpanel-${filters.tab}`}
        aria-label={`Conversaciones: ${filters.tab}`}
        className="flex-1 overflow-y-auto py-2"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-12" aria-label="Cargando conversaciones">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="px-4 py-8 text-center text-sm text-red-400">
            Error al cargar conversaciones
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-500">No hay conversaciones</p>
          </div>
        )}

        {filtered.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedConversationId === conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
          />
        ))}
      </div>
    </aside>
  );
}

type ConversationItemProps = {
  conversation: {
    id: string;
    channel: string;
    status: string;
    assignedAgentId: string | null;
    lastMessageAt: string | null;
    messageCount: number;
  };
  isSelected: boolean;
  onClick: () => void;
};

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const time = conversation.lastMessageAt
    ? formatRelativeTime(new Date(conversation.lastMessageAt))
    : "";

  const statusColor = {
    open: "bg-emerald-500",
    pending: "bg-yellow-500",
    resolved: "bg-gray-500",
  }[conversation.status] ?? "bg-gray-500";

  return (
    <div
      role="listitem"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      tabIndex={0}
      aria-selected={isSelected}
      className={`mx-2 rounded-xl px-3 py-3 cursor-pointer transition-all duration-150 group flex items-start gap-3 ${
        isSelected
          ? "bg-emerald-500/10 border border-emerald-500/30"
          : "hover:bg-[#374151]/60 border border-transparent"
      }`}
    >
      {/* Avatar placeholder */}
      <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0">
        <InboxChannelBadge channel={conversation.channel} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-200 truncate">
            Contacto
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0">{time}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`}
            aria-label={`Estado: ${conversation.status}`}
          />
          <span className="text-xs text-gray-500 truncate">
            {conversation.status === "open"
              ? "Conversación activa"
              : conversation.status === "pending"
              ? "Pendiente"
              : "Resuelta"}
          </span>
          {!conversation.assignedAgentId && conversation.status === "open" && (
            <span className="text-xs text-yellow-500 flex-shrink-0">• Sin asignar</span>
          )}
        </div>
      </div>
    </div>
  );
}
