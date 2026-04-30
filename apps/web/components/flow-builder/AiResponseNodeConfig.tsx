"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAiCredentials } from "@/hooks/useAiCredentials";

type AiResponseNodeDataEditable = {
  prompt?: string;
  model?: string;
  preferredProvider?: string;
};

type AiResponseNodeConfigProps = {
  nodeId: string;
  nodeData: AiResponseNodeDataEditable;
  onUpdate: (data: Partial<AiResponseNodeDataEditable>) => void;
  onClose: () => void;
};

export function AiResponseNodeConfig({
  nodeId,
  nodeData,
  onUpdate,
  onClose,
}: AiResponseNodeConfigProps) {
  const { credentials, isLoading } = useAiCredentials();
  const [testMessage, setTestMessage] = useState("");

  const activeCredentials = credentials.filter((c) => c.isActive);
  const DEFAULT_PROMPT = "Eres un asistente de atención al cliente.";

  return (
    <div className="w-72 border-l border-[#374151] bg-[#1F2937] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#374151] flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-200">Configurar AI Response</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#374151] rounded transition-colors"
          title="Cerrar panel"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Prompt del sistema */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
            Prompt del sistema
          </label>
          <textarea
            value={nodeData.prompt ?? ""}
            onChange={(e) => onUpdate({ prompt: e.target.value })}
            placeholder={DEFAULT_PROMPT}
            className="w-full h-24 px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* Proveedor preferido */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
            Proveedor preferido
          </label>
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-gray-500">Cargando credenciales...</div>
          ) : activeCredentials.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500 bg-[#111827] border border-[#374151] rounded-lg">
              Configura tus API keys en Settings → AI Credentials
            </div>
          ) : (
            <select
              value={nodeData.preferredProvider ?? ""}
              onChange={(e) =>
                onUpdate({ preferredProvider: e.target.value || undefined })
              }
              className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="">Auto (fallback automático)</option>
              {activeCredentials.map((cred) => (
                <option key={cred.id} value={cred.provider}>
                  {cred.provider.charAt(0).toUpperCase() + cred.provider.slice(1)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Vista previa simulada */}
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">
            Vista previa simulada
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Ej: Hola, necesito ayuda"
              className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />

            {/* Preview box */}
            <div className="bg-[#111827] border border-[#374151] rounded-lg p-3 space-y-2 text-xs">
              <div>
                <span className="text-gray-400">Sistema:</span>
                <p className="text-gray-300 mt-1 leading-relaxed">
                  {nodeData.prompt || DEFAULT_PROMPT}
                </p>
              </div>
              {testMessage && (
                <>
                  <div className="border-t border-[#374151] pt-2">
                    <span className="text-gray-400">Usuario:</span>
                    <p className="text-gray-300 mt-1">{testMessage}</p>
                  </div>
                  <div className="border-t border-[#374151] pt-2 text-violet-400">
                    → El agente AI generará una respuesta con base en este contexto
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
