"use client";

import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";

type DelayNodeData = {
  label?: string;
  delaySeconds?: number;
};

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h`;
}

export function DelayNode({ data }: { data: DelayNodeData }) {
  return (
    <div className="bg-[#1F2937] border border-purple-500/50 rounded-xl px-4 py-3 min-w-[160px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-[#111827]"
      />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
          Esperar
        </span>
      </div>
      <p className="text-sm text-gray-200">
        {data.delaySeconds != null
          ? formatDelay(data.delaySeconds)
          : <span className="text-gray-500 italic">Sin configurar</span>
        }
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-[#111827]"
      />
    </div>
  );
}
