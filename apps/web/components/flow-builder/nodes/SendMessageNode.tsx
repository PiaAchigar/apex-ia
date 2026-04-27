"use client";

import { Handle, Position } from "@xyflow/react";
import { MessageSquare } from "lucide-react";

type SendMessageNodeData = {
  label?: string;
  message?: string;
};

export function SendMessageNode({ data }: { data: SendMessageNodeData }) {
  return (
    <div className="bg-[#1F2937] border border-blue-500/50 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#111827]"
      />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
          Enviar mensaje
        </span>
      </div>
      <p className="text-sm text-gray-200 line-clamp-2">
        {data.message ?? <span className="text-gray-500 italic">Sin mensaje</span>}
      </p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-[#111827]"
      />
    </div>
  );
}
