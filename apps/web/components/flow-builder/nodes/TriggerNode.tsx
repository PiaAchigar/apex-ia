"use client";

import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";

type TriggerNodeData = {
  label?: string;
  triggerType?: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  new_conversation: "Nueva conversación",
  keyword_match: "Palabra clave",
  tag_added: "Tag agregado",
};

export function TriggerNode({ data }: { data: TriggerNodeData }) {
  return (
    <div className="bg-[#1F2937] border border-emerald-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
          Trigger
        </span>
      </div>
      <p className="text-sm text-gray-200 truncate">
        {TRIGGER_LABELS[data.triggerType ?? ""] ?? data.triggerType ?? "Sin configurar"}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-[#111827]"
      />
    </div>
  );
}
