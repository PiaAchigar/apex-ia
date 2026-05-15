"use client";

import { useState } from "react";
import { useCreatePipeline } from "@/hooks/usePipelines";
import { X, Loader2 } from "lucide-react";

type PipelineCreateModalProps = {
  onClose: () => void;
};

export function PipelineCreateModal({ onClose }: PipelineCreateModalProps) {
  const [name, setName] = useState("");
  const { mutate: createPipeline, isPending } = useCreatePipeline();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createPipeline(name.trim(), {
      onSuccess: () => {
        setName("");
        onClose();
      },
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1F2937] border border-[#374151] rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151]">
          <h2 className="text-lg font-semibold text-white">Crear nuevo pipeline</h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="pipeline-name" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del pipeline
            </label>
            <input
              id="pipeline-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Ventas B2B"
              disabled={isPending}
              autoFocus
              maxLength={100}
              className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
