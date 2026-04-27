"use client";

import { useState } from "react";
import { PipelineBoardKanban } from "@/components/pipeline/PipelineBoardKanban";
import { ChevronDown } from "lucide-react";

// Hardcoded pipeline list — replaced with dynamic fetch in a later phase
const DEFAULT_PIPELINES = [
  { id: "default", name: "Pipeline de ventas" },
];

export default function PipelinePage() {
  const [selectedPipelineId, setSelectedPipelineId] = useState(DEFAULT_PIPELINES[0]!.id);

  const selectedPipeline =
    DEFAULT_PIPELINES.find((p) => p.id === selectedPipelineId) ?? DEFAULT_PIPELINES[0]!;

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
            {DEFAULT_PIPELINES.map((p) => (
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
        <PipelineBoardKanban pipelineId={selectedPipelineId} />
      </div>
    </div>
  );
}
