"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Key, Copy, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useApiKeys } from "@/hooks/useApiKeys";

export default function ApiAccessPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { keys, isLoading, generate, revoke } = useApiKeys();

  // Modal states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [generateSaving, setGenerateSaving] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleGenerateKey = async () => {
    setGenerateError("");
    if (!keyName.trim()) {
      setGenerateError("El nombre de la key es requerido");
      return;
    }

    setGenerateSaving(true);
    try {
      const result = await generate(keyName.trim());
      setGeneratedKey(result.key);
      setKeyName("");
    } catch (err) {
      const error = err as any;
      setGenerateError(error.message || "Error al generar API key");
    } finally {
      setGenerateSaving(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (
      !window.confirm("¿Estás seguro? Las aplicaciones usando esta key dejarán de funcionar.")
    ) {
      return;
    }

    try {
      await revoke(keyId);
      setRevokeSuccess(true);
      setTimeout(() => setRevokeSuccess(false), 3000);
    } catch (err) {
      const error = err as any;
      console.error(error.message || "Error al revocar key");
    }
  };

  const handleCopyKey = async (text: string, keyId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyId) {
        setCopiedKeyId(keyId);
        setTimeout(() => setCopiedKeyId(null), 2000);
      }
    } catch (err) {
      console.error("Error copying to clipboard:", err);
    }
  };

  const closeGenerateModal = () => {
    setShowGenerateModal(false);
    setGeneratedKey(null);
    setKeyName("");
    setGenerateError("");
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${slug}/settings`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Acceso API</h1>
              <p className="text-gray-400">Genera y gestiona API keys para acceso programático</p>
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Nueva API Key
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Seguridad importante</p>
            <p>
              Las API keys otorgan acceso completo a tu organización. Nunca las compartas públicamente.
              Revoca una key si crees que ha sido comprometida.
            </p>
          </div>
        </div>

        {/* Success messages */}
        {generateSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm">
            API key generada correctamente
          </div>
        )}
        {revokeSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm">
            API key revocada correctamente
          </div>
        )}

        {/* Keys List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">Cargando API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No hay API keys generadas</p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Generar la primera API key
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 flex items-center justify-between hover:border-[#4B5563] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {apiKey.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400 text-sm font-mono bg-[#111827] px-2 py-1 rounded">
                        {apiKey.keyPrefix}...
                      </span>
                      <span className="text-gray-500 text-xs">
                        {apiKey.lastUsedAt
                          ? `Última vez: ${new Date(apiKey.lastUsedAt).toLocaleDateString("es-AR")}`
                          : "Nunca usada"}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <span
                    className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                      apiKey.isActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {apiKey.isActive ? "Activa" : "Revocada"}
                  </span>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRevoke(apiKey.id)}
                  disabled={!apiKey.isActive}
                  className={`ml-4 p-2 rounded-lg transition-colors ${
                    apiKey.isActive
                      ? "hover:bg-red-500/10 text-red-400 hover:text-red-300"
                      : "text-gray-600 cursor-not-allowed"
                  }`}
                  title={apiKey.isActive ? "Revocar key" : "Key ya revocada"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-[#1F2937] border border-[#374151] shadow-lg p-6">
            {generatedKey ? (
              <>
                {/* State 2: Key Generated */}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    API Key Generada
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Copia tu API key. No podrás verla de nuevo.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                      Tu API Key
                    </label>
                    <div className="bg-[#111827] border border-[#374151] rounded-lg p-4 break-all font-mono text-sm text-emerald-300 relative group">
                      {generatedKey}
                      <button
                        onClick={() => handleCopyKey(generatedKey, "key")}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-[#374151] rounded"
                        title="Copiar"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg text-sm flex gap-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Guardá esta key en un lugar seguro. No podrás verla de nuevo.
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeGenerateModal}
                  className="w-full mt-6 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                >
                  Entendido, la guardé
                </button>
              </>
            ) : (
              <>
                {/* State 1: Form */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Nueva API Key
                  </h2>
                  <button
                    onClick={closeGenerateModal}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Nombre de la Key
                    </label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="ej: Integración Zapier"
                      className="w-full bg-[#111827] border border-[#374151] text-white rounded-lg px-3 py-2 focus:border-emerald-500/50 focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>

                  {generateError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm">
                      {generateError}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={closeGenerateModal}
                    className="flex-1 px-4 py-2 bg-[#111827] border border-[#374151] text-gray-300 rounded-lg hover:border-[#4B5563] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateKey}
                    disabled={generateSaving}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {generateSaving && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Generar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
