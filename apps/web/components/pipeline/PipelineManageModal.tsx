"use client";

import { useState } from "react";
import {
  useRenamePipeline,
  useDeletePipeline,
  useCreatePipeline,
} from "@/hooks/usePipelines";
import {
  useAddStage,
  useUpdateStage,
  useDeleteStage,
} from "@/hooks/usePipelineStages";
import { X, Loader2, Trash2, Plus, ArrowUpDown } from "lucide-react";
import { StageOrderEditor } from "./StageOrderEditor";

export interface StageForManage {
  id: string;
  name: string;
  color: string | null;
  order: number;
  dealsCount: number;
}

type PipelineManageModalProps = {
  pipelineId: string;
  pipelineName: string;
  stages: StageForManage[];
  onClose: () => void;
  onPipelineCreated?: (newPipelineId: string) => void;
};

export function PipelineManageModal({
  pipelineId,
  pipelineName,
  stages,
  onClose,
  onPipelineCreated,
}: PipelineManageModalProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "create">("edit");
  const [editingName, setEditingName] = useState(pipelineName);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#10B981");
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [confirmDeletePipeline, setConfirmDeletePipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [isEditingStageOrder, setIsEditingStageOrder] = useState(false);

  const { mutate: renamePipeline, isPending: isRenamingPipeline } =
    useRenamePipeline();
  const { mutate: deletePipeline, isPending: isDeletingPipeline } =
    useDeletePipeline();
  const { mutate: createPipeline, isPending: isCreatingPipeline } =
    useCreatePipeline();
  const { mutate: addStage, isPending: isAddingStage } = useAddStage();
  const { mutate: updateStage, isPending: isUpdatingStage } = useUpdateStage();
  const { mutate: deleteStage, isPending: isDeletingStage } = useDeleteStage();

  const isLoading =
    isRenamingPipeline ||
    isDeletingPipeline ||
    isCreatingPipeline ||
    isAddingStage ||
    isUpdatingStage ||
    isDeletingStage;

  function handleRenameClick() {
    if (editingName.trim() && editingName !== pipelineName) {
      renamePipeline({
        pipelineId,
        name: editingName.trim(),
      });
    }
  }

  function handleAddStage() {
    if (!newStageName.trim()) return;

    addStage(
      {
        pipelineId,
        name: newStageName.trim(),
        color: newStageColor,
      },
      {
        onSuccess: () => {
          setNewStageName("");
          setNewStageColor("#10B981");
        },
      }
    );
  }

  function handleDeleteStage(stageId: string) {
    // Get the first stage that is not the current one to move deals
    const targetStage = stages.find((s) => s.id !== stageId);

    deleteStage({
      pipelineId,
      stageId,
      targetStageId: targetStage?.id,
    });

    setDeletingStageId(null);
  }

  function handleDeletePipeline() {
    deletePipeline(pipelineId, {
      onSuccess: () => {
        onClose();
      },
    });
  }

  function handleStageNameChange(stageId: string, newName: string) {
    if (!newName.trim()) return;

    updateStage({
      pipelineId,
      stageId,
      name: newName.trim(),
    });
  }

  function handleStageColorChange(stageId: string, newColor: string) {
    updateStage({
      pipelineId,
      stageId,
      color: newColor,
    });
  }

  function handleCreatePipeline() {
    if (!newPipelineName.trim()) return;

    createPipeline(newPipelineName.trim(), {
      onSuccess: (data) => {
        setNewPipelineName("");
        setActiveTab("edit");
        onPipelineCreated?.(data.id);
      },
    });
  }

  async function handleSaveStageOrder(
    reorderedStages: Array<{ id: string; order: number }>
  ) {
    // Update each stage with new order
    for (const stage of reorderedStages) {
      await new Promise<void>((resolve, reject) => {
        updateStage(
          {
            pipelineId,
            stageId: stage.id,
            order: stage.order,
          },
          {
            onSuccess: () => resolve(),
            onError: () => reject(),
          }
        );
      });
    }
    setIsEditingStageOrder(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1F2937] border border-[#374151] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151] flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">Gestionar canales</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 border-b border-[#374151] bg-[#111827]/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "edit"
                ? "text-emerald-400 border-emerald-500"
                : "text-gray-400 border-transparent hover:text-gray-300"
            }`}
          >
            Editar
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "create"
                ? "text-emerald-400 border-emerald-500"
                : "text-gray-400 border-transparent hover:text-gray-300"
            }`}
          >
            Nuevo canal
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "edit" ? (
            <>
              {/* Section: Pipeline Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
              Información del Pipeline
            </h3>

            <div className="space-y-2">
              <label
                htmlFor="pipeline-name-edit"
                className="block text-sm font-medium text-gray-300"
              >
                Nombre
              </label>
              <div className="flex gap-2">
                <input
                  id="pipeline-name-edit"
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  disabled={isLoading}
                  maxLength={100}
                  className="flex-1 bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={handleRenameClick}
                  disabled={
                    isLoading ||
                    !editingName.trim() ||
                    editingName === pipelineName
                  }
                  className="px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#374151]">
              {confirmDeletePipeline ? (
                <div className="space-y-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">
                    ¿Estás seguro? Se eliminarán todas las etapas y deals del
                    pipeline.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDeletePipeline(false)}
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDeletePipeline}
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeletingPipeline && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeletePipeline(true)}
                  disabled={isLoading}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Eliminar pipeline
                </button>
              )}
            </div>
          </div>

          {/* Section: Stages */}
          <div className="space-y-4">
            {!isEditingStageOrder ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                    Etapas ({stages.length})
                  </h3>
                  <button
                    onClick={() => setIsEditingStageOrder(true)}
                    disabled={isLoading || stages.length < 2}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Editar orden
                  </button>
                </div>

                <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 bg-[#111827] border border-[#374151] rounded-lg group hover:border-[#4B5563] transition-colors"
                >
                  {/* Color picker */}
                  <input
                    type="color"
                    value={stage.color || "#10B981"}
                    onChange={(e) =>
                      handleStageColorChange(stage.id, e.target.value)
                    }
                    disabled={isLoading}
                    className="w-8 h-8 rounded-lg cursor-pointer disabled:opacity-50"
                    aria-label={`Color de etapa ${stage.name}`}
                  />

                  {/* Stage name */}
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) =>
                      handleStageNameChange(stage.id, e.target.value)
                    }
                    onBlur={() => {}}
                    disabled={isLoading}
                    maxLength={50}
                    className="flex-1 bg-transparent border-0 text-white focus:outline-none focus:ring-0 disabled:opacity-50"
                  />

                  {/* Deal count badge */}
                  <span className="text-xs font-medium text-gray-400 px-2 py-1 bg-[#374151] rounded">
                    {stage.dealsCount}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeletingStageId(stage.id)}
                    disabled={isLoading}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Eliminar etapa ${stage.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Delete confirmation */}
                  {deletingStageId === stage.id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 bg-[#1F2937] p-1 rounded-lg shadow-lg border border-[#374151]">
                      <button
                        onClick={() => setDeletingStageId(null)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs text-gray-300 hover:bg-[#374151] rounded disabled:opacity-50"
                      >
                        No
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded disabled:opacity-50 flex items-center gap-1"
                      >
                        {isDeletingStage && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        Sí
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

                {/* Add stage form */}
                <div className="space-y-2 pt-4 border-t border-[#374151]">
                  <label htmlFor="new-stage-name" className="block text-sm font-medium text-gray-300">
                    Agregar nueva etapa
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-stage-name"
                      type="text"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Nombre de la etapa"
                      disabled={isLoading}
                      maxLength={50}
                      className="flex-1 bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-sm"
                    />
                    <input
                      type="color"
                      value={newStageColor}
                      onChange={(e) => setNewStageColor(e.target.value)}
                      disabled={isLoading}
                      className="w-10 h-10 rounded-lg cursor-pointer disabled:opacity-50"
                      aria-label="Color de nueva etapa"
                    />
                    <button
                      onClick={handleAddStage}
                      disabled={isLoading || !newStageName.trim()}
                      className="px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                    >
                      {isAddingStage && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <StageOrderEditor
                stages={stages.map((s) => ({
                  id: s.id,
                  name: s.name,
                  order: s.order,
                }))}
                onSave={handleSaveStageOrder}
                onCancel={() => setIsEditingStageOrder(false)}
              />
            )}
          </div>
            </>
          ) : (
            /* Tab: Create New Pipeline */
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
                Crear nuevo canal
              </h3>

              <div className="space-y-2">
                <label
                  htmlFor="new-pipeline-name"
                  className="block text-sm font-medium text-gray-300"
                >
                  Nombre del canal
                </label>
                <input
                  id="new-pipeline-name"
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Ej: Ventas Directas, Inbound, etc."
                  disabled={isLoading}
                  maxLength={100}
                  className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>

              <p className="text-xs text-gray-500">
                Se creará con una etapa inicial "Prospecto" que podrás editar luego.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#374151] flex-shrink-0 flex gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Cerrar
          </button>
          {activeTab === "create" && (
            <button
              onClick={handleCreatePipeline}
              disabled={isLoading || !newPipelineName.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
            >
              {isCreatingPipeline && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Crear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
