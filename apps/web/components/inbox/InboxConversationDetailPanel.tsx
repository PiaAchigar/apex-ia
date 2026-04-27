"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { InboxMessageBubble } from "./InboxMessageBubble";
import { InboxChannelBadge } from "./InboxChannelBadge";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api-client";
import {
  Send,
  Loader2,
  CheckCheck,
  UserCheck,
  MoreVertical,
  Paperclip,
} from "lucide-react";
import { formatRelativeTime } from "@apex-ia/utils";

type Conversation = {
  id: string;
  channel: string;
  status: string;
  assignedAgentId: string | null;
  lastMessageAt: string | null;
  messageCount: number;
};

type InboxConversationDetailPanelProps = {
  conversation: Conversation | null;
  orgSlug: string;
};

export function InboxConversationDetailPanel({
  conversation,
  orgSlug,
}: InboxConversationDetailPanelProps) {
  if (!conversation) {
    return <EmptyState />;
  }

  return (
    <ConversationThread key={conversation.id} conversation={conversation} orgSlug={orgSlug} />
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#111827] gap-3">
      <div className="w-16 h-16 rounded-2xl bg-[#1F2937] border border-[#374151] flex items-center justify-center">
        <CheckCheck className="w-7 h-7 text-gray-600" />
      </div>
      <p className="text-sm text-gray-500">Seleccioná una conversación</p>
    </div>
  );
}

function ConversationThread({
  conversation,
}: {
  conversation: Conversation;
  orgSlug: string;
}) {
  const { data: messages, isLoading, bottomRef } = useConversationMessages(conversation.id);
  const { user } = useAuthStore();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isResolved = conversation.status === "resolved";

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || isResolved) return;

    setIsSending(true);
    setSendError(null);
    setText("");

    try {
      await apiClient.post(`/conversations/${conversation.id}/messages`, {
        content: trimmed,
      });
    } catch {
      setSendError("No se pudo enviar el mensaje. Intentá de nuevo.");
      setText(trimmed);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [text, isSending, isResolved, conversation.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleResolve = async () => {
    try {
      await apiClient.patch(`/inbox/conversations/${conversation.id}/resolve`, {});
    } catch {
      // ignore — optimistic update handled by socket
    }
  };

  const handleAssignToMe = async () => {
    if (!user?.userId) return;
    setIsAssigning(true);
    try {
      await apiClient.patch(`/inbox/conversations/${conversation.id}/assign`, {
        agentId: user.userId,
      });
    } catch {
      // ignore
    } finally {
      setIsAssigning(false);
    }
  };

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const lastTime = conversation.lastMessageAt
    ? formatRelativeTime(new Date(conversation.lastMessageAt))
    : "";

  return (
    <div className="flex-1 flex flex-col bg-[#111827] min-w-0 h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3.5 bg-[#1F2937] border-b border-[#374151] flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center flex-shrink-0">
          <InboxChannelBadge channel={conversation.channel} size="md" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100 truncate">Contacto</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusDot status={conversation.status} />
            <span className="text-xs text-gray-500">{lastTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {conversation.status === "open" && !conversation.assignedAgentId && (
            <button
              onClick={handleAssignToMe}
              disabled={isAssigning}
              aria-label="Asignarme esta conversación"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors duration-150 cursor-pointer disabled:opacity-50"
            >
              {isAssigning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              Asignarme
            </button>
          )}

          {conversation.status === "open" && (
            <button
              onClick={handleResolve}
              aria-label="Marcar conversación como resuelta"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 border border-[#374151] rounded-lg hover:bg-[#374151]/60 transition-colors duration-150 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Resolver
            </button>
          )}

          <button
            aria-label="Más opciones"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#374151]/60 transition-colors duration-150 cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        role="log"
        aria-label="Mensajes de la conversación"
        aria-live="polite"
        className="flex-1 overflow-y-auto px-5 py-4"
      >
        {isLoading && (
          <div className="flex items-center justify-center py-12" aria-label="Cargando mensajes">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        )}

        {!isLoading && (!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm text-gray-600">Aún no hay mensajes</p>
          </div>
        )}

        {messages?.map((msg) => (
          <InboxMessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Send input */}
      <div
        className={`flex-shrink-0 border-t border-[#374151] bg-[#1F2937] px-4 py-3 ${
          isResolved ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {sendError && (
          <p role="alert" className="text-xs text-red-400 mb-2 px-1">
            {sendError}
          </p>
        )}

        {isResolved && (
          <p className="text-xs text-gray-500 text-center mb-2">
            Esta conversación está resuelta
          </p>
        )}

        <div className="flex items-end gap-2">
          <button
            aria-label="Adjuntar archivo"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#374151]/60 transition-colors duration-150 cursor-pointer flex-shrink-0 mb-0.5"
          >
            <Paperclip className="w-4 h-4" aria-hidden="true" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isResolved ? "Conversación resuelta" : "Escribí un mensaje... (Enter para enviar)"}
            disabled={isResolved}
            aria-label="Campo de mensaje"
            className="flex-1 bg-[#111827] border border-[#374151] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all duration-200 min-h-[40px] max-h-[120px] overflow-y-auto"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending || isResolved}
            aria-label="Enviar mensaje"
            className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex-shrink-0 mb-0.5 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "open"
      ? "bg-emerald-500"
      : status === "pending"
      ? "bg-yellow-500"
      : "bg-gray-500";

  const label =
    status === "open" ? "Activa" : status === "pending" ? "Pendiente" : "Resuelta";

  return (
    <span className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} aria-hidden="true" />
      <span className="text-xs text-gray-500">{label}</span>
    </span>
  );
}
