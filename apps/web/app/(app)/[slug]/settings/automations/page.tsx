"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AutomationUploadModal } from "@/components/automations/AutomationUploadModal";
import { AutomationList } from "@/components/automations/AutomationList";

export default function AutomationsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="h-full overflow-auto bg-[#111827]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#374151] bg-[#1F2937]/95 backdrop-blur-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Automatizaciones</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Sube archivos Python o JSON para automatizar tus procesos
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva Automatización
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        <AutomationList />

        {/* Info Box */}
        <div className="mt-8 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            <strong>Nota:</strong> Integración con n8n Cloud — disponible próximamente. Actualmente soportamos ejecución local de scripts Python y validación de workflows JSON.
          </p>
        </div>
      </div>

      <AutomationUploadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
