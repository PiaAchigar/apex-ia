"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";

type ConditionNodeData = {
  label?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: "es igual a",
  not_equals: "no es igual a",
  contains: "contiene",
  starts_with: "empieza con",
};

export function ConditionNode({ data }: { data: ConditionNodeData }) {
  const hasCondition = data.conditionField && data.conditionOperator;

  return (
    <div className="bg-[#1F2937] border border-amber-500/50 rounded-xl px-4 py-3 min-w-[200px] shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-[#111827]"
      />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <GitBranch className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
          Condición
        </span>
      </div>
      {hasCondition ? (
        <p className="text-sm text-gray-200">
          <span className="text-gray-400">{data.conditionField}</span>
          {" "}
          <span className="text-amber-400">
            {OPERATOR_LABELS[data.conditionOperator ?? ""] ?? data.conditionOperator}
          </span>
          {" "}
          <span className="text-gray-200">&quot;{data.conditionValue}&quot;</span>
        </p>
      ) : (
        <p className="text-sm text-gray-500 italic">Sin configurar</p>
      )}
      <Handle
        type="source"
        id="true"
        position={Position.Bottom}
        style={{ left: "35%" }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-[#111827]"
      />
      <Handle
        type="source"
        id="false"
        position={Position.Bottom}
        style={{ left: "65%" }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-[#111827]"
      />
      <div className="flex justify-between px-1 mt-1">
        <span className="text-[9px] text-emerald-400">Sí</span>
        <span className="text-[9px] text-red-400">No</span>
      </div>
    </div>
  );
}
