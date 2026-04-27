"use client";

import { useState } from "react";
import { useContactDetails } from "@/hooks/useContactDetails";
import { apiClient } from "@/lib/api-client";
import { User, Mail, Phone, MessageCircle, Edit2, Archive, Loader2 } from "lucide-react";

type ContactDetailSidebarProps = {
  contactId: string | null;
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-500/10 text-green-400 border-green-500/20",
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  facebook: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  telegram: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  email: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  webchat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const STATUS_DOT: Record<string, string> = {
  open: "bg-emerald-500",
  pending: "bg-yellow-500",
  resolved: "bg-gray-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function ContactDetailSidebar({ contactId }: ContactDetailSidebarProps) {
  const { contact, isLoading, isError, refetch } = useContactDetails(contactId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  if (!contactId) {
    return (
      <aside className="w-80 flex-shrink-0 bg-[#1F2937] border-l border-[#374151] flex flex-col items-center justify-center h-full">
        <User className="w-12 h-12 text-gray-600 mb-3" aria-hidden="true" />
        <p className="text-gray-500 text-sm">Seleccioná un contacto</p>
      </aside>
    );
  }

  if (isLoading) {
    return (
      <aside className="w-80 flex-shrink-0 bg-[#1F2937] border-l border-[#374151] flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" aria-label="Cargando" />
      </aside>
    );
  }

  if (isError || !contact) {
    return (
      <aside className="w-80 flex-shrink-0 bg-[#1F2937] border-l border-[#374151] flex items-center justify-center h-full">
        <p className="text-red-400 text-sm px-4 text-center">Error al cargar el contacto</p>
      </aside>
    );
  }

  function openEdit() {
    setEditName(contact!.name);
    setEditEmail(contact!.email ?? "");
    setEditPhone(contact!.phone ?? "");
    setIsEditing(true);
  }

  async function handleSave() {
    if (!contactId) return;
    setIsSaving(true);
    try {
      await apiClient.patch(`/contacts/${contactId}`, {
        name: editName,
        email: editEmail || null,
        phone: editPhone || null,
      });
      setIsEditing(false);
      refetch();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!contactId) return;
    setIsArchiving(true);
    try {
      await apiClient.delete(`/contacts/${contactId}/archive`);
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-[#1F2937] border-l border-[#374151] flex flex-col h-full overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 px-5 py-6 border-b border-[#374151]">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-semibold">
          {getInitials(contact.name)}
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-base">{contact.name}</p>
          {contact.createdAt && (
            <p className="text-gray-500 text-xs mt-0.5">
              Desde {formatDate(contact.createdAt)}
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-5 py-4 border-b border-[#374151] space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-gray-300 truncate">{contact.email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-gray-300">{contact.phone ?? "—"}</span>
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="px-5 py-4 border-b border-[#374151] space-y-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Editar contacto</p>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre"
            className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="Teléfono"
            className="w-full bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Recent conversations */}
      <div className="px-5 py-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Conversaciones recientes
          </p>
        </div>

        {contact.recentConversations.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-4">Sin conversaciones</p>
        )}

        <ul className="space-y-2">
          {contact.recentConversations.map((conv) => {
            const channelClass =
              CHANNEL_COLORS[conv.channel.toLowerCase()] ??
              "bg-gray-500/10 text-gray-400 border-gray-500/20";
            const dotClass = STATUS_DOT[conv.status] ?? "bg-gray-500";

            return (
              <li
                key={conv.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#111827] border border-[#374151]/60"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${channelClass}`}
                >
                  {conv.channel}
                </span>
                <span className="flex-1 text-xs text-gray-500 truncate">
                  {conv.lastMessageAt
                    ? new Date(conv.lastMessageAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "—"}
                </span>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
                  aria-label={`Estado: ${conv.status}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-[#374151] flex gap-2">
        <button
          onClick={openEdit}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-[#374151] text-gray-200 hover:bg-[#4B5563] transition-colors"
        >
          <Edit2 className="w-4 h-4" aria-hidden="true" />
          Editar
        </button>
        <button
          onClick={handleArchive}
          disabled={isArchiving}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          <Archive className="w-4 h-4" aria-hidden="true" />
          {isArchiving ? "Archivando..." : "Archivar"}
        </button>
      </div>
    </aside>
  );
}
