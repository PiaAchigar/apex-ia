"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAiCredentials } from "@/hooks/useAiCredentials";
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Check } from "lucide-react";

export default function AiCredentialsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { credentials, create, update, delete: deleteCredential, isLoading } = useAiCredentials();

  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<"anthropic" | "openai" | "gemini" | "openrouter">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await create({ provider, apiKey, isPrimary });
      setApiKey("");
      setProvider("anthropic");
      setIsPrimary(false);
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error creating credential:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePrimary = async (credId: string, newValue: boolean) => {
    try {
      await update({ id: credId, input: { isPrimary: newValue } });
    } catch (error) {
      console.error("Error updating credential:", error);
    }
  };

  const handleDelete = async (credId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta credencial?")) return;
    try {
      await deleteCredential(credId);
    } catch (error) {
      console.error("Error deleting credential:", error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Back Link */}
        <Link href={`/${slug}/settings`} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Configuración</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Credenciales de IA</h1>
          <p className="text-gray-400">Gestiona tus API keys para proveedores de IA</p>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm">Credencial creada exitosamente</p>
          </div>
        )}

        {/* Add Credential Form */}
        {showForm ? (
          <form onSubmit={handleAddCredential} className="bg-[#1F2937] border border-[#374151] rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Nueva Credencial</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Proveedor</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2 text-white focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openai">OpenAI (GPT)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Pega tu API key aquí"
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:border-emerald-500/50 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-[#374151] text-emerald-500 focus:ring-emerald-500/50"
                />
                <label htmlFor="isPrimary" className="ml-3 text-sm font-medium text-gray-300">
                  Usar como proveedor principal
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                {saving ? "Guardando..." : "Guardar Credencial"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setApiKey("");
                  setProvider("anthropic");
                  setIsPrimary(false);
                }}
                className="flex-1 bg-[#111827] border border-[#374151] text-gray-300 hover:border-emerald-500/50 px-4 py-2 rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar Credencial
          </button>
        )}

        {/* Credentials List */}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-400">Cargando credenciales...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">No hay credenciales configuradas</p>
            <p className="text-gray-500 text-sm">Agrega una credencial para comenzar a usar IA en Apex</p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-white capitalize">{cred.provider}</h3>
                      <p className="text-xs text-gray-500 mt-1">Creada: {new Date(cred.createdAt).toLocaleDateString()}</p>
                    </div>
                    {cred.isPrimary && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                        Primaria
                      </span>
                    )}
                    {!cred.isActive && (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-300">
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!cred.isPrimary && (
                    <button
                      onClick={() => handleTogglePrimary(cred.id, true)}
                      className="px-3 py-1 bg-[#111827] border border-[#374151] text-gray-300 hover:border-emerald-500/50 rounded text-sm font-medium transition-all"
                    >
                      Usar como Primaria
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(cred.id)}
                    className="p-2 hover:bg-red-500/10 text-red-400 rounded transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 <strong>Tip:</strong> Puedes agregar múltiples credenciales y establecer una como primaria. Si el proveedor
            principal falla, se intentará automáticamente con los proveedores de fallback.
          </p>
        </div>
      </div>
    </div>
  );
}
