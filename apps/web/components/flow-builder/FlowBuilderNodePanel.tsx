"use client";

import { Zap, GitBranch, MessageSquare, Clock, Sparkles, GitMerge } from "lucide-react";

type NodeType = {
  type: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const NODE_TYPES: NodeType[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Inicia el flow",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  {
    type: "condition",
    label: "Condición",
    description: "Ramificación lógica",
    icon: GitBranch,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20",
  },
  {
    type: "send_message",
    label: "Enviar mensaje",
    description: "Envía texto al contacto",
    icon: MessageSquare,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
  },
  {
    type: "delay",
    label: "Esperar",
    description: "Pausa antes del siguiente paso",
    icon: Clock,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20",
  },
  {
    type: "ai_response",
    label: "Respuesta AI",
    description: "Genera respuesta con IA",
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20",
  },
  {
    type: "sub_flow",
    label: "Sub-flow",
    description: "Ejecuta otro flow",
    icon: GitMerge,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
  },
];

type FlowBuilderNodePanelProps = {
  onAddNode: (type: string) => void;
};

export function FlowBuilderNodePanel({ onAddNode }: FlowBuilderNodePanelProps) {
  return (
    <aside className="w-56 flex-shrink-0 bg-[#1F2937] border-r border-[#374151] flex flex-col">
      <div className="px-4 py-3 border-b border-[#374151]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Nodos
        </h3>
        <p className="text-xs text-gray-600 mt-0.5">Arrastrar o hacer clic para agregar</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {NODE_TYPES.map((nodeType) => {
          const Icon = nodeType.icon;
          return (
            <button
              key={nodeType.type}
              onClick={() => onAddNode(nodeType.type)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${nodeType.bgColor}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={`w-4 h-4 ${nodeType.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${nodeType.color}`}>{nodeType.label}</p>
                <p className="text-xs text-gray-500 truncate">{nodeType.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
