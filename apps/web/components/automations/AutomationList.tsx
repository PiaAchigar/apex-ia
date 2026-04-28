"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Play, Trash2, Power, Loader2 } from "lucide-react";

type Automation = {
  id: string;
  name: string;
  type: "python" | "json";
  isActive: boolean;
  executedCount: number;
  lastExecutedAt?: string;
  createdAt: string;
};

export function AutomationList() {
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: () => apiClient.get<Automation[]>("/settings/automations"),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/settings/automations/${id}/execute`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/settings/automations/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/settings/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-sm">
          <p className="mb-1">Sube tu primera automatización</p>
          <p className="text-xs text-gray-500">Archivos .py (Python) o .json (JSON)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {automations.map((automation) => (
        <div
          key={automation.id}
          className="flex items-center justify-between p-3 rounded-lg bg-[#1F2937] border border-[#374151] hover:border-[#4B5563] transition-all"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-100 truncate">{automation.name}</h3>
              <span
                className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                  automation.type === "python"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                }`}
              >
                {automation.type}
              </span>
              <span
                className={`inline-flex text-xs px-2 py-0.5 rounded-full ${
                  automation.isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                }`}
              >
                {automation.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>Ejecuciones: {automation.executedCount}</span>
              {automation.lastExecutedAt && (
                <span>Última: {new Date(automation.lastExecutedAt).toLocaleDateString("es-ES")}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => executeMutation.mutate(automation.id)}
              disabled={executeMutation.isPending || !automation.isActive}
              title="Ejecutar"
              className="p-2 rounded-lg bg-[#111827] hover:bg-[#0F172A] text-gray-400 hover:text-emerald-400 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleMutation.mutate({ id: automation.id, isActive: !automation.isActive })}
              disabled={toggleMutation.isPending}
              title={automation.isActive ? "Desactivar" : "Activar"}
              className="p-2 rounded-lg bg-[#111827] hover:bg-[#0F172A] text-gray-400 hover:text-amber-400 transition-all disabled:opacity-50"
            >
              <Power className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (confirm("¿Estás seguro de que deseas eliminar esta automatización?")) {
                  deleteMutation.mutate(automation.id);
                }
              }}
              disabled={deleteMutation.isPending}
              title="Eliminar"
              className="p-2 rounded-lg bg-[#111827] hover:bg-[#0F172A] text-gray-400 hover:text-red-400 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
