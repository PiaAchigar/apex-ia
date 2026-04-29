"use client";

import { useState, useEffect } from "react";
import { PipelineBoardKanban } from "@/components/pipeline/PipelineBoardKanban";
import { usePipelines } from "@/hooks/usePipelines";
import { ChevronDown, Loader2 } from "lucide-react";

export default function PipelinePage() {
  const { data: pipelines, isLoading, isError } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");

  // Set the first pipeline as selected when pipelines load
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0]!.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline = pipelines?.find((p) => p.id === selectedPipelineId) ?? pipelines?.[0];

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Error cargando pipelines
      </div>
    );
  }

  if (isLoading || !pipelines || pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        Cargando pipelines...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#374151] flex-shrink-0">
        <h1 className="text-xl font-semibold text-white">Pipeline</h1>

        {/* Pipeline selector */}
        <div className="relative">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="appearance-none bg-[#1F2937] border border-[#374151] text-sm text-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label="Seleccionar pipeline"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        {selectedPipelineId && <PipelineBoardKanban pipelineId={selectedPipelineId} />}
      </div>
    </div>
  );
}
