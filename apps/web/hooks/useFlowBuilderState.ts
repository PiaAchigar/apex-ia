"use client";

import { useCallback } from "react";
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react";
import type { Node, Edge, Connection } from "@xyflow/react";

const INITIAL_NODES: Node[] = [
  {
    id: "trigger-1",
    type: "trigger",
    position: { x: 300, y: 80 },
    data: { label: "Trigger", triggerType: "new_conversation" },
  },
];

const INITIAL_EDGES: Edge[] = [];

export function useFlowBuilderState(
  initialNodes?: Node[],
  initialEdges?: Edge[]
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes ?? INITIAL_NODES
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges ?? INITIAL_EDGES
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: string) => {
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type,
        position: { x: 300, y: 100 + nodes.length * 120 },
        data: { label: type, type },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deleteNode,
  };
}
