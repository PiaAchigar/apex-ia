import { Plus } from "lucide-react";
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

type PipelineStageColumnProps = {
  stage: Stage;
  onMoveDeal: (dealId: string, targetStageId: string) => void;
  onAddDeal: (stageId: string) => void;
};

function sumAmounts(deals: Deal[]): string | null {
  const nums = deals
    .map((d) => (d.amount !== null ? parseFloat(d.amount) : NaN))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return null;

  const total = nums.reduce((acc, n) => acc + n, 0);
  return `$${total.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export function PipelineStageColumn({ stage, onMoveDeal, onAddDeal }: PipelineStageColumnProps) {
  const total = sumAmounts(stage.deals);
  const dotColor = stage.color ?? "#10B981";

  return (
    <div className="flex flex-col w-64 flex-shrink-0 bg-[#1F2937] border border-[#374151] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#374151]">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-gray-200 flex-1 truncate">{stage.name}</span>
        <span className="text-xs font-mono text-gray-500 ml-auto flex-shrink-0 bg-[#374151] px-1.5 py-0.5 rounded">
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
            onMoveToStage={onMoveDeal}
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
