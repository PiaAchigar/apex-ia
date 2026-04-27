"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Megaphone,
  Plus,
  Loader2,
  MoreHorizontal,
  Send,
  Pause,
  XCircle,
  BarChart2,
} from "lucide-react";

type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: CampaignStatus;
  targetCount: number | null;
  sentCount: number | null;
  scheduledAt: string | null;
  createdAt: string | null;
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "Enviando",
  paused: "Pausada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_CLASSES: Record<CampaignStatus, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  whatsapp_qr: "WhatsApp QR",
  instagram: "Instagram",
  facebook: "Facebook",
  telegram: "Telegram",
  email: "Email",
};

type CreateCampaignForm = {
  name: string;
  channel: string;
  messageContent: string;
};

export function CampaignList() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreateCampaignForm>({
    name: "",
    channel: "whatsapp",
    messageContent: "",
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiClient.get<Campaign[]>("/campaigns"),
    staleTime: 30_000,
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.messageContent.trim()) return;
    setCreating(true);
    try {
      await apiClient.post("/campaigns", form);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setShowCreateModal(false);
      setForm({ name: "", channel: "whatsapp", messageContent: "" });
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (
    campaignId: string,
    action: "pause" | "resume" | "cancel"
  ) => {
    setActionLoading(`${campaignId}-${action}`);
    try {
      await apiClient.post(`/campaigns/${campaignId}/${action}`, {});
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setActionLoading(null);
      setOpenMenuId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111827]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 text-emerald-400" />
          <h1 className="text-base font-semibold text-gray-100">Campañas</h1>
          {campaigns && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#374151] text-gray-400">
              {campaigns.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva campaña
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {!campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No hay campañas todavía</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              Crear primera campaña
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-[#1F2937] rounded-xl border border-[#374151] px-5 py-4 flex items-center gap-4 hover:border-[#4B5563] transition-all duration-150"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-100 truncate">
                      {campaign.name}
                    </h3>
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        STATUS_CLASSES[campaign.status] ?? STATUS_CLASSES.draft
                      }`}
                    >
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{CHANNEL_LABELS[campaign.channel] ?? campaign.channel}</span>
                    {campaign.targetCount != null && campaign.targetCount > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {campaign.sentCount ?? 0}/{campaign.targetCount} enviados
                        </span>
                      </>
                    )}
                    {campaign.scheduledAt && (
                      <>
                        <span>·</span>
                        <span>
                          {new Date(campaign.scheduledAt).toLocaleDateString("es", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/${slug}/campaigns/${campaign.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-[#374151] transition-colors cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    Ver
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)
                      }
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#374151] transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {openMenuId === campaign.id && (
                      <div className="absolute right-0 top-8 w-36 bg-[#1F2937] border border-[#374151] rounded-xl shadow-xl z-10 py-1">
                        {campaign.status === "running" && (
                          <button
                            onClick={() => handleAction(campaign.id, "pause")}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-400 hover:bg-[#374151] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Pause className="w-3 h-3" />
                            Pausar
                          </button>
                        )}
                        {campaign.status === "paused" && (
                          <button
                            onClick={() => handleAction(campaign.id, "resume")}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-emerald-400 hover:bg-[#374151] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            Reanudar
                          </button>
                        )}
                        {["draft", "scheduled", "running", "paused"].includes(
                          campaign.status
                        ) && (
                          <button
                            onClick={() => handleAction(campaign.id, "cancel")}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-[#374151] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F2937] rounded-2xl border border-[#374151] w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-[#374151]">
              <h2 className="text-sm font-semibold text-gray-100">Nueva campaña</h2>
            </div>
            <div className="px-6 py-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Nombre
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Promo de verano"
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Canal
                </label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-sm text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="whatsapp_qr">WhatsApp QR</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Mensaje
                </label>
                <textarea
                  value={form.messageContent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, messageContent: e.target.value }))
                  }
                  placeholder="Escribe el mensaje de la campaña..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#374151] flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#374151] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.messageContent.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
