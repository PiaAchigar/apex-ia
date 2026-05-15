"use client";

import { Plus, Edit2, Check, X } from "lucide-react";
import { useState } from "react";
import { useUpdateStage } from "@/hooks/usePipelineStages";
import { PipelineDealCard } from "./PipelineDealCard";

type Deal = {
  id: string;
  title: string;
  amount: string | null;
  probability: number | null;
  assignedAgentId: string | null;
  contactId: string | null;
  stageId: string;
  createdAt: string | null;
};

type Stage = {
  id: string;
  name: string;
  color: string | null;
  order: number;
  deals: Deal[];
};

type OtherStage = {
  id: string;
  name: string;
};

type PipelineStageColumnProps = {
  pipelineId: string;
  stage: Stage;
  movingDealId: string | null;
  onMoveDeal: (dealId: string, targetStageId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  onAddDeal: (stageId: string) => void;
  deletingDealId: string | null;
  otherStages: OtherStage[];
};

function sumAmounts(deals: Deal[]): string | null {
  const nums = deals
    .map((d) => (d.amount !== null ? parseFloat(d.amount) : NaN))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return null;

  const total = nums.reduce((acc, n) => acc + n, 0);
  return `$${total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export function PipelineStageColumn({
  pipelineId,
  stage,
  movingDealId,
  onMoveDeal,
  onDeleteDeal,
  onAddDeal,
  deletingDealId,
  otherStages,
}: PipelineStageColumnProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(stage.name);
  const { mutate: updateStage, isPending: isUpdatingStage } = useUpdateStage();

  const total = sumAmounts(stage.deals);
  const dotColor = stage.color ?? "#10B981";

  function handleSaveStageName() {
    if (!editingName.trim() || editingName === stage.name) {
      setIsEditingName(false);
      setEditingName(stage.name);
      return;
    }

    updateStage(
      {
        pipelineId,
        stageId: stage.id,
        name: editingName.trim(),
      },
      {
        onSuccess: () => {
          setIsEditingName(false);
        },
        onError: () => {
          setEditingName(stage.name);
          setIsEditingName(false);
        },
      }
    );
  }

  return (
    <div className="flex flex-col w-64 flex-shrink-0 bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#374151] group hover:bg-[#374151]/20 transition-colors">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        {isEditingName ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveStageName();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setEditingName(stage.name);
                }
              }}
              maxLength={50}
              autoFocus
              disabled={isUpdatingStage}
              className="flex-1 bg-[#111827] border border-emerald-500 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
            <button
              onClick={handleSaveStageName}
              disabled={isUpdatingStage}
              className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 p-1"
              aria-label="Guardar"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEditingName(false);
                setEditingName(stage.name);
              }}
              disabled={isUpdatingStage}
              className="text-gray-400 hover:text-gray-300 disabled:opacity-50 p-1"
              aria-label="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold text-gray-200 flex-1 truncate">
              {stage.name}
            </span>
            <button
              onClick={() => setIsEditingName(true)}
              disabled={isUpdatingStage}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-400 disabled:opacity-50 transition-opacity p-1"
              aria-label="Editar nombre"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <span className="text-xs font-mono text-gray-500 flex-shrink-0 bg-[#374151] px-1.5 py-0.5 rounded">
          {stage.deals.length}
        </span>
      </div>

      {/* Total amount */}
      {total !== null && (
        <div className="px-3 py-1.5 border-b border-[#374151]/50">
          <span className="text-xs text-emerald-400 font-medium">{total}</span>
        </div>
      )}

      {/* Deal list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
        {stage.deals.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">Sin deals</p>
        )}
        {stage.deals.map((deal) => (
          <PipelineDealCard
            key={deal.id}
            deal={deal}
            isMoving={movingDealId === deal.id}
            isDeleting={deletingDealId === deal.id}
            otherStages={otherStages}
            onMoveToStage={onMoveDeal}
            onDeleteDeal={onDeleteDeal}
          />
        ))}
      </div>

      {/* Add deal button */}
      <div className="p-2 border-t border-[#374151]">
        <button
          onClick={() => onAddDeal(stage.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Nuevo deal
        </button>
      </div>
    </div>
  );
}
