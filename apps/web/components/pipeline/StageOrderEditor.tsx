"use client";

import { useState, useEffect } from "react";
import { GripVertical, Loader2 } from "lucide-react";

export interface StageForOrder {
  id: string;
  name: string;
  order: number;
}

type StageOrderEditorProps = {
  stages: StageForOrder[];
  onSave: (reorderedStages: Array<{ id: string; order: number }>) => Promise<void>;
  onCancel: () => void;
};

export function StageOrderEditor({
  stages,
  onSave,
  onCancel,
}: StageOrderEditorProps) {
  const [orderedStages, setOrderedStages] = useState<StageForOrder[]>(stages);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrderedStages(stages);
  }, [stages]);

  function handleDragStart(e: React.DragEvent, stageId: string) {
    setDraggedItem(stageId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(
    e: React.DragEvent,
    targetIndex: number
  ) {
    e.preventDefault();
    if (!draggedItem) return;

    const draggedIndex = orderedStages.findIndex((s) => s.id === draggedItem);
    if (draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    const newStages = [...orderedStages];
    const [removed] = newStages.splice(draggedIndex, 1);
    newStages.splice(targetIndex, 0, removed);

    setOrderedStages(newStages);
    setDraggedItem(null);
  }

  async function handleSave() {
    // Build array of { id, order } for stages that changed order
    const reordered = orderedStages.map((stage, index) => ({
      id: stage.id,
      order: index,
    }));

    setIsSaving(true);
    try {
      await onSave(reordered);
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = JSON.stringify(orderedStages) !== JSON.stringify(stages);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">Editar orden de etapas</h3>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {orderedStages.map((stage, index) => (
          <div
            key={stage.id}
            draggable
            onDragStart={(e) => handleDragStart(e, stage.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className={`flex items-center gap-3 p-3 bg-[#111827] border rounded-lg transition-all cursor-move ${
              draggedItem === stage.id
                ? "opacity-50 border-emerald-500 bg-emerald-500/10"
                : "border-[#374151] hover:border-[#4B5563]"
            }`}
          >
            <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{stage.name}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-gray-400 bg-[#374151] px-2.5 py-1 rounded-md">
                {index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-3 py-2 rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  );
}
