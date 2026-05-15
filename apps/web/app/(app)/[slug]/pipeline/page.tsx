"use client";

import { useState, useEffect } from "react";
import { usePipelineDealsGroupedByStage } from "@/hooks/usePipelineDealsGroupedByStage";
import { usePipelines } from "@/hooks/usePipelines";
import { PipelineBoardKanban } from "@/components/pipeline/PipelineBoardKanban";
import { PipelineCreateModal } from "@/components/pipeline/PipelineCreateModal";
import { PipelineManageModal } from "@/components/pipeline/PipelineManageModal";
import { PipelineDealCreateModal } from "@/components/pipeline/PipelineDealCreateModal";
import { ChevronDown, Loader2, Plus, Filter, Search } from "lucide-react";

export default function PipelinePage() {
  const { data: pipelines, isLoading, isError } = usePipelines();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddDealModal, setShowAddDealModal] = useState(false);

  const { data: boardData } = usePipelineDealsGroupedByStage(selectedPipelineId);

  // Set the first pipeline as selected when pipelines load
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0]!.id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline =
    pipelines?.find((p) => p.id === selectedPipelineId) ?? pipelines?.[0];

  function toggleFilter(filterKey: string) {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterKey)) {
      newFilters.delete(filterKey);
    } else {
      newFilters.add(filterKey);
    }
    setActiveFilters(newFilters);
  }

  function handleAddStage() {
    setShowManageModal(true);
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Error cargando pipelines
      </div>
    );
  }

  if (isLoading || !pipelines) {
    return (
      <div className="flex items-center justify-center h-full gap-2 text-gray-400">
        <Loader2 size={20} className="animate-spin" />
        Cargando pipelines...
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-400">No hay canales de ventas creados</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Crear primer canal
        </button>
        {showCreateModal && (
          <PipelineCreateModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    );
  }

  const stages = boardData?.stages ?? [];

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Header Row 1 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#374151] flex-shrink-0">
        <h1 className="text-xl font-semibold text-white">Pipeline</h1>

        {/* Pipeline selector with default badge */}
        <div className="relative">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="appearance-none bg-[#1F2937] border border-[#374151] text-sm text-gray-300 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label="Seleccionar pipeline"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.isDefault ? "• Default" : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {/* Manage button */}
        <button
          onClick={() => setShowManageModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors"
        >
          Administrar
        </button>

        {/* Search input */}
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clientes, contactos, etiquetas..."
            className="w-full bg-[#1F2937] border border-[#374151] text-sm text-gray-300 pl-9 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600"
          />
        </div>

        {/* Filters button */}
        <button className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Header Row 2 - Quick filters and actions */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#374151] flex-shrink-0 flex-wrap">
        {/* Filter chips */}
        {[
          { key: "myDeals", label: "Mis Clientes" },
          { key: "highPriority", label: "Alta Prioridad" },
          { key: "overdue", label: "Vencidos" },
          { key: "unassigned", label: "Sin Asignar" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleFilter(key)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              activeFilters.has(key)
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-[#374151]/30 text-gray-400 border border-[#374151]/50 hover:border-[#374151]"
            }`}
          >
            {label}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={handleAddStage}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-[#374151] rounded-lg hover:bg-[#374151]/40 transition-colors"
        >
          + Agregar Etapa
        </button>
        <button
          onClick={() => setShowAddDealModal(true)}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-[#374151] rounded-lg hover:bg-[#374151]/40 transition-colors"
        >
          + Agregar Cliente
        </button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        {selectedPipelineId && (
          <PipelineBoardKanban
            pipelineId={selectedPipelineId}
            onAddStage={handleAddStage}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <PipelineCreateModal onClose={() => setShowCreateModal(false)} />
      )}

      {showManageModal && selectedPipeline && (
        <PipelineManageModal
          pipelineId={selectedPipeline.id}
          pipelineName={selectedPipeline.name}
          stages={stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            color: stage.color,
            order: stage.order,
            dealsCount: stage.deals.length,
          }))}
          onClose={() => setShowManageModal(false)}
          onPipelineCreated={(newId) => setSelectedPipelineId(newId)}
        />
      )}

      {showAddDealModal && selectedPipelineId && stages.length > 0 && (
        <PipelineDealCreateModal
          pipelineId={selectedPipelineId}
          stageId={stages[0]!.id}
          orgSlug={typeof window !== "undefined" ? sessionStorage.getItem("apex_org_slug") ?? "" : ""}
          onClose={() => setShowAddDealModal(false)}
        />
      )}
    </div>
  );
}
