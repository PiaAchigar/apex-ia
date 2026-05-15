"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePipelineDealsGroupedByStage } from "@/hooks/usePipelineDealsGroupedByStage";
import { apiClient } from "@/lib/api-client";
import { PipelineStageColumn } from "./PipelineStageColumn";
import { PipelineDealCreateModal } from "./PipelineDealCreateModal";
import { Columns, Plus } from "lucide-react";

type PipelineBoardKanbanProps = {
  pipelineId: string;
  onAddStage?: () => void;
};

function SkeletonColumn() {
  return (
    <div className="flex flex-col w-64 flex-shrink-0 bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden animate-pulse">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#374151]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#374151]" />
        <div className="h-3.5 bg-[#374151] rounded w-24" />
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#111827] rounded-xl border border-[#374151]" />
        ))}
      </div>
    </div>
  );
}

export function PipelineBoardKanban({
  pipelineId,
  onAddStage,
}: PipelineBoardKanbanProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = usePipelineDealsGroupedByStage(pipelineId);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [addDealModal, setAddDealModal] = useState<{
    open: boolean;
    stageId: string | null;
  }>({
    open: false,
    stageId: null,
  });

  // Get org slug from sessionStorage (set during login)
  const orgSlug =
    typeof window !== "undefined"
      ? sessionStorage.getItem("apex_org_slug") ?? ""
      : "";

  async function handleMoveDeal(dealId: string, targetStageId: string) {
    setMovingDealId(dealId);
    try {
      await apiClient.patch(`/pipeline/deals/${dealId}/move`, {
        targetStageId,
      });
      // Invalidate the board query to refresh
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", pipelineId],
      });
    } finally {
      setMovingDealId(null);
    }
  }

  async function handleDeleteDeal(dealId: string) {
    setDeletingDealId(dealId);
    try {
      await apiClient.delete(`/pipeline/deals/${dealId}`);
      // Invalidate the board query to refresh
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", pipelineId],
      });
    } finally {
      setDeletingDealId(null);
    }
  }

  function handleAddDeal(stageId: string) {
    setAddDealModal({ open: true, stageId });
  }

  function handleCloseModal() {
    setAddDealModal({ open: false, stageId: null });
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 px-6 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonColumn key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 text-sm">
        Error al cargar el tablero
      </div>
    );
  }

  const stages = data?.stages ?? [];

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <Columns className="w-12 h-12 text-gray-600" aria-hidden="true" />
        <p className="text-gray-400 font-medium">No hay etapas en este pipeline</p>
        <p className="text-gray-600 text-sm max-w-xs">
          Configurá las etapas del pipeline en la sección de Ajustes.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex gap-4 overflow-x-auto pb-6 px-6 pt-4 h-full items-start"
        aria-label="Tablero Kanban"
      >
        {stages.map((stage) => (
          <PipelineStageColumn
            key={stage.id}
            pipelineId={pipelineId}
            stage={stage}
            movingDealId={movingDealId}
            onMoveDeal={handleMoveDeal}
            onDeleteDeal={handleDeleteDeal}
            onAddDeal={handleAddDeal}
            deletingDealId={deletingDealId}
            otherStages={stages.filter((s) => s.id !== stage.id)}
          />
        ))}

        {/* Add stage button */}
        <button
          onClick={onAddStage}
          className="flex-shrink-0 w-64 h-12 flex items-center justify-center gap-2 border-2 border-dashed border-[#374151] rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:border-[#4B5563] transition-colors"
          aria-label="Agregar nueva etapa"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Agregar etapa
        </button>
      </div>

      {/* Deal Creation Modal */}
      {addDealModal.open && addDealModal.stageId && (
        <PipelineDealCreateModal
          pipelineId={pipelineId}
          stageId={addDealModal.stageId}
          orgSlug={orgSlug}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
