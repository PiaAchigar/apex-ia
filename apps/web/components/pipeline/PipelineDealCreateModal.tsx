"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { X, Loader2 } from "lucide-react";

export interface PipelineDealCreateModalProps {
  pipelineId: string;
  stageId: string;
  orgSlug: string;
  onClose: () => void;
}

export function PipelineDealCreateModal({
  pipelineId,
  stageId,
  orgSlug,
  onClose,
}: PipelineDealCreateModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    probability: 50,
    assignedAgentId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || "" : name === "probability" ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("El título del deal es requerido");
      return;
    }

    if (formData.amount === "" || formData.amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/pipeline/deals", {
        pipelineId,
        stageId,
        title: formData.title,
        amount: formData.amount,
        probability: formData.probability,
        assignedAgentId: formData.assignedAgentId || null,
      });

      // Invalidate and refetch pipeline board
      await queryClient.invalidateQueries({
        queryKey: ["pipeline-board", pipelineId],
      });

      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error creando deal";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Crear nuevo deal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              Título del deal *
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Proyecto ABC"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
              Monto (ARS) *
            </label>
            <input
              id="amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="50000"
              min="0"
              step="1000"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
          </div>

          {/* Probability */}
          <div>
            <label htmlFor="probability" className="block text-sm font-medium text-gray-300 mb-1">
              Probabilidad: {formData.probability}%
            </label>
            <input
              id="probability"
              type="range"
              name="probability"
              min="0"
              max="100"
              value={formData.probability}
              onChange={handleChange}
              className="w-full cursor-pointer"
              disabled={isLoading}
            />
          </div>

          {/* Assigned Agent (optional) */}
          <div>
            <label htmlFor="assignedAgentId" className="block text-sm font-medium text-gray-300 mb-1">
              Asignar a agente (opcional)
            </label>
            <input
              id="assignedAgentId"
              type="text"
              name="assignedAgentId"
              value={formData.assignedAgentId}
              onChange={handleChange}
              placeholder="ID del agente"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? "Creando..." : "Crear deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
