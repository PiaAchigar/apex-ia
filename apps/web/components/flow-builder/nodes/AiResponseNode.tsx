"use client";

import { Handle, Position } from "@xyflow/react";
import { Sparkles } from "lucide-react";

type AiResponseNodeData = {
  label?: string;
  prompt?: string;
  model?: string;
};

export function AiResponseNode({ data }: { data: AiResponseNodeData }) {
  return (
    <div className="bg-[#1F2937] border border-violet-500/50 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-[#111827]"
      />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
          Respuesta AI
        </span>
      </div>
      {data.model && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-1">
          {data.model}
        </span>
      )}
      <p className="text-sm text-gray-200 line-clamp-2">
        {data.prompt ?? <span className="text-gray-500 italic">Sin prompt</span>}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-[#111827]"
      />
    </div>
  );
}
