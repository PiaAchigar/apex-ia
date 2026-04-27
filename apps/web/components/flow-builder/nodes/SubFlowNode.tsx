"use client";

import { Handle, Position } from "@xyflow/react";
import { GitMerge } from "lucide-react";

type SubFlowNodeData = {
  label?: string;
  subFlowId?: string;
  subFlowName?: string;
};

export function SubFlowNode({ data }: { data: SubFlowNodeData }) {
  return (
    <div className="bg-[#1F2937] border border-orange-500/50 rounded-xl px-4 py-3 min-w-[180px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-[#111827]"
      />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <GitMerge className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
          Sub-flow
        </span>
      </div>
      <p className="text-sm text-gray-200 truncate">
        {data.subFlowName ?? data.subFlowId ?? (
          <span className="text-gray-500 italic">Sin configurar</span>
        )}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-[#111827]"
      />
    </div>
  );
}
