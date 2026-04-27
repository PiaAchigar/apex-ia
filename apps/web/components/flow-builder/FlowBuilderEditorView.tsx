"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FlowBuilderCanvas } from "./FlowBuilderCanvas";
import { Loader2 } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

type Flow = {
  id: string;
  name: string;
  isActive: boolean | null;
  nodesJson: unknown;
  edgesJson: unknown;
};

type FlowBuilderEditorViewProps = {
  flowId: string;
};

export function FlowBuilderEditorView({ flowId }: FlowBuilderEditorViewProps) {
  const queryClient = useQueryClient();

  const { data: flow, isLoading, isError } = useQuery<Flow>({
    queryKey: ["flow", flowId],
    queryFn: () => apiClient.get<Flow>(`/flows/${flowId}`),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (isError || !flow) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">No se pudo cargar el flow</p>
      </div>
    );
  }

  return (
    <FlowBuilderCanvas
      flowId={flow.id}
      flowName={flow.name}
      isActive={flow.isActive ?? false}
      initialNodes={(flow.nodesJson as Node[]) ?? []}
      initialEdges={(flow.edgesJson as Edge[]) ?? []}
      onSaved={() => queryClient.invalidateQueries({ queryKey: ["flows"] })}
    />
  );
}
