"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Zap, Plus, Loader2, Power, PowerOff, Trash2, Edit3 } from "lucide-react";

type Flow = {
  id: string;
  name: string;
  triggerType: string | null;
  isActive: boolean | null;
  version: number | null;
  createdAt: string | null;
};

const TRIGGER_LABELS: Record<string, string> = {
  new_conversation: "Nueva conversación",
  keyword_match: "Palabra clave",
  tag_added: "Tag agregado",
};

export function FlowBuilderListView() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newTriggerType, setNewTriggerType] = useState("new_conversation");
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: flows, isLoading } = useQuery<Flow[]>({
    queryKey: ["flows"],
    queryFn: () => apiClient.get<Flow[]>("/flows"),
    staleTime: 30_000,
  });

  const handleCreate = async () => {
    if (!newFlowName.trim()) return;
    setCreating(true);
    try {
      const created = await apiClient.post<Flow>("/flows", {
        name: newFlowName.trim(),
        triggerType: newTriggerType,
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            data: { label: "Trigger", triggerType: newTriggerType },
            position: { x: 300, y: 80 },
          },
        ],
        edges: [],
      });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      setShowCreateModal(false);
      setNewFlowName("");
      router.push(`/${slug}/flow-builder/${created.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (flow: Flow) => {
    const action = flow.isActive ? "deactivate" : "activate";
    setActionLoading(`${flow.id}-${action}`);
    try {
      await apiClient.post(`/flows/${flow.id}/${action}`, {});
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (flowId: string) => {
    setActionLoading(`${flowId}-delete`);
    try {
      await apiClient.delete(`/flows/${flowId}`);
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    } finally {
      setActionLoading(null);
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
          <Zap className="w-5 h-5 text-emerald-400" />
          <h1 className="text-base font-semibold text-gray-100">Flow Builder</h1>
          {flows && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#374151] text-gray-400">
              {flows.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo flow
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {!flows || flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center">
              <Zap className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No hay flows todavía</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              Crear primer flow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 flex flex-col gap-3 hover:border-[#4B5563] transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        flow.isActive ? "bg-emerald-500" : "bg-gray-600"
                      }`}
                    />
                    <h3 className="text-sm font-medium text-gray-100 truncate">
                      {flow.name}
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                    v{flow.version ?? 1}
                  </span>
                </div>

                {flow.triggerType && (
                  <span className="inline-block text-xs text-gray-500">
                    {TRIGGER_LABELS[flow.triggerType] ?? flow.triggerType}
                  </span>
                )}

                <div className="flex items-center gap-2 pt-1 border-t border-[#374151]">
                  <button
                    onClick={() => router.push(`/${slug}/flow-builder/${flow.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-[#374151] transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  <button
                    onClick={() => handleToggleActive(flow)}
                    disabled={actionLoading?.startsWith(flow.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50 ${
                      flow.isActive
                        ? "text-amber-400 hover:bg-amber-500/10"
                        : "text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    {actionLoading === `${flow.id}-${flow.isActive ? "deactivate" : "activate"}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : flow.isActive ? (
                      <PowerOff className="w-3.5 h-3.5" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    {flow.isActive ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    onClick={() => handleDelete(flow.id)}
                    disabled={actionLoading?.startsWith(flow.id)}
                    className="ml-auto flex items-center gap-1 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading === `${flow.id}-delete` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1F2937] rounded-2xl border border-[#374151] w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-[#374151]">
              <h2 className="text-sm font-semibold text-gray-100">Nuevo flow</h2>
            </div>
            <div className="px-6 py-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Nombre del flow
                </label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Ej: Bienvenida automática"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Tipo de trigger
                </label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-sm text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="new_conversation">Nueva conversación</option>
                  <option value="keyword_match">Palabra clave</option>
                  <option value="tag_added">Tag agregado</option>
                </select>
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
                disabled={creating || !newFlowName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Crear y editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
