"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFlowBuilderState } from "@/hooks/useFlowBuilderState";
import { FlowBuilderNodePanel } from "./FlowBuilderNodePanel";
import { AiResponseNodeConfig } from "./AiResponseNodeConfig";
import { TriggerNode } from "./nodes/TriggerNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { SendMessageNode } from "./nodes/SendMessageNode";
import { DelayNode } from "./nodes/DelayNode";
import { AiResponseNode } from "./nodes/AiResponseNode";
import { SubFlowNode } from "./nodes/SubFlowNode";
import { apiClient } from "@/lib/api-client";
import { Save, Power, PowerOff, Loader2 } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

const NODE_TYPES = {
  trigger: TriggerNode,
  condition: ConditionNode,
  send_message: SendMessageNode,
  delay: DelayNode,
  ai_response: AiResponseNode,
  sub_flow: SubFlowNode,
};

type FlowBuilderCanvasProps = {
  flowId: string;
  flowName: string;
  isActive: boolean;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSaved?: () => void;
};

export function FlowBuilderCanvas({
  flowId,
  flowName,
  isActive,
  initialNodes,
  initialEdges,
  onSaved,
}: FlowBuilderCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deselectAll,
  } = useFlowBuilderState(initialNodes, initialEdges);

  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [active, setActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/flows/${flowId}`, { nodes, edges });
      onSaved?.();
    } catch {
      setError("Error al guardar el flow");
    } finally {
      setSaving(false);
    }
  }, [flowId, nodes, edges, onSaved]);

  const handleToggleActive = useCallback(async () => {
    setToggling(true);
    setError(null);
    try {
      if (active) {
        await apiClient.post(`/flows/${flowId}/deactivate`, {});
        setActive(false);
      } else {
        await apiClient.post(`/flows/${flowId}/activate`, {});
        setActive(true);
      }
    } catch {
      setError("Error al cambiar el estado del flow");
    } finally {
      setToggling(false);
    }
  }, [flowId, active]);

  return (
    <div className="flex h-full">
      <FlowBuilderNodePanel onAddNode={addNode} />

      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#374151] bg-[#1F2937] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-200 truncate max-w-xs">
              {flowName}
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
              }`}
            >
              {active ? "Activo" : "Inactivo"}
            </span>
          </div>

          {error && (
            <span className="text-xs text-red-400">{error}</span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer ${
                active
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : active ? (
                <PowerOff className="w-3 h-3" />
              ) : (
                <Power className="w-3 h-3" />
              )}
              {active ? "Desactivar" : "Activar"}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Guardar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex">
          <div className="flex-1 bg-[#111827]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={NODE_TYPES}
              fitView
              defaultEdgeOptions={{
                style: { stroke: "#374151", strokeWidth: 2 },
                animated: true,
              }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="#374151"
                gap={20}
                size={1}
              />
              <Controls
                style={{
                  background: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
              />
              <MiniMap
                style={{
                  background: "#1F2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                }}
                nodeColor="#374151"
                maskColor="rgba(17, 24, 39, 0.7)"
              />
            </ReactFlow>
          </div>

          {/* Config Panel */}
          {(() => {
            const selectedNode = nodes.find((n) => n.selected && n.type === "ai_response");
            if (!selectedNode) return null;
            return (
              <AiResponseNodeConfig
                nodeId={selectedNode.id}
                nodeData={
                  selectedNode.data as {
                    prompt?: string;
                    model?: string;
                    preferredProvider?: string;
                  }
                }
                onUpdate={(data) => updateNodeData(selectedNode.id, data)}
                onClose={deselectAll}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}
