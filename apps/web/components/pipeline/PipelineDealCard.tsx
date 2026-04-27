import { User, DollarSign } from "lucide-react";

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

type PipelineDealCardProps = {
  deal: Deal;
  onMoveToStage: (dealId: string, targetStageId: string) => void;
};

function formatAmount(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
}

export function PipelineDealCard({ deal, onMoveToStage }: PipelineDealCardProps) {
  return (
    <div className="bg-[#111827] border border-[#374151] rounded-xl p-3 cursor-default hover:border-emerald-500/40 transition-colors duration-150 group">
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
            <span className="truncate max-w-[80px]">{deal.assignedAgentId.slice(0, 8)}</span>
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-600">
            <User className="w-3 h-3" aria-hidden="true" />
            Sin asignar
          </span>
        )}
      </div>
    </div>
  );
}
