import { useState } from "react";
import { User, DollarSign, MoreVertical, Trash2, Loader2 } from "lucide-react";

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

type OtherStage = {
  id: string;
  name: string;
};

type PipelineDealCardProps = {
  deal: Deal;
  isMoving?: boolean;
  isDeleting?: boolean;
  otherStages: OtherStage[];
  onMoveToStage: (dealId: string, targetStageId: string) => void;
  onDeleteDeal: (dealId: string) => void;
};

function formatAmount(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export function PipelineDealCard({
  deal,
  isMoving = false,
  isDeleting = false,
  otherStages,
  onMoveToStage,
  onDeleteDeal,
}: PipelineDealCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isLoading = isMoving || isDeleting;

  return (
    <div
      className={`bg-[#111827] border border-[#374151] rounded-xl p-3 cursor-default hover:border-emerald-500/40 transition-colors duration-150 group relative ${
        isLoading ? "opacity-50" : ""
      }`}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-gray-200 leading-snug mb-2 line-clamp-2">
        {deal.title}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {deal.amount !== null && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <DollarSign className="w-3 h-3" aria-hidden="true" />
            {formatAmount(deal.amount)}
          </span>
        )}

        {deal.probability !== null && (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium ${
              deal.probability >= 70
                ? "bg-emerald-500/10 text-emerald-400"
                : deal.probability >= 40
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {deal.probability}%
          </span>
        )}

        {deal.assignedAgentId ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" aria-hidden="true" />
            <span className="truncate max-w-[80px]">
              {deal.assignedAgentId.slice(0, 8)}
            </span>
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3" aria-hidden="true" />
            Sin asignar
          </span>
        )}

        {/* Context menu button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isLoading}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-300 disabled:opacity-50 ml-auto"
            aria-label="Opciones del deal"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context menu dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-6 bg-[#1F2937] border border-[#374151] rounded-lg shadow-lg z-10 min-w-[160px]">
              {/* Mover a etapa submenu */}
              {otherStages.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 border-b border-[#374151]">
                    Mover a:
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {otherStages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => {
                          onMoveToStage(deal.id, stage.id);
                          setShowMenu(false);
                        }}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#374151] transition-colors disabled:opacity-50"
                      >
                        {stage.name}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#374151]" />
                </>
              )}

              {/* Delete button */}
              <button
                onClick={() => {
                  onDeleteDeal(deal.id);
                  setShowMenu(false);
                }}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-b-lg"
              >
                <Trash2 className="w-3 h-3" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
