"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, AlertCircle, CheckCircle, Loader } from "lucide-react";
import Link from "next/link";

type WhatsAppBehavior = {
  typingIndicators: boolean;
  splitLongMessages: boolean;
  linkPreview: boolean;
};

export default function WhatsAppBehaviorPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [behavior, setBehavior] = useState<WhatsAppBehavior>({
    typingIndicators: true,
    splitLongMessages: true,
    linkPreview: true,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "idle";
    message: string;
  }>({ type: "idle", message: "" });

  const handleToggle = (field: keyof WhatsAppBehavior) => {
    setBehavior((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const res = await fetch(`/api/settings/whatsapp-behavior`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(behavior),
      });

      if (res.ok) {
        setStatus({
          type: "success",
          message: "Comportamiento de WhatsApp actualizado",
        });
      } else {
        setStatus({
          type: "error",
          message: "Error al actualizar la configuración",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/${slug}/settings`}
            className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
              Comportamiento WhatsApp
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Personaliza cómo se envían los mensajes en WhatsApp
            </p>
          </div>
        </div>

        {/* Status Alert */}
        {status.type !== "idle" && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              status.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-red-500/10 border-red-500/25 text-red-300"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{status.message}</p>
          </div>
        )}

        {/* Toggle Options */}
        <div className="space-y-4 mb-6">
          {/* Typing Indicators */}
          <div className="p-4 rounded-lg border border-[#374151] bg-[#1F2937]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Indicadores de Escritura</h3>
                <p className="text-sm text-gray-400">
                  Muestra "escribiendo..." cuando estás redactando un mensaje. El contacto verá
                  que estás escribiendo antes de que envíes.
                </p>
              </div>
              <button
                onClick={() => handleToggle("typingIndicators")}
                className={`flex-shrink-0 relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  behavior.typingIndicators ? "bg-emerald-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    behavior.typingIndicators ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Split Long Messages */}
          <div className="p-4 rounded-lg border border-[#374151] bg-[#1F2937]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Dividir Mensajes Largos</h3>
                <p className="text-sm text-gray-400">
                  Si habilitado, los mensajes mayores a 1500 caracteres se envían como múltiples
                  mensajes separados. Si está deshabilitado, se envía como un único mensaje.
                </p>
              </div>
              <button
                onClick={() => handleToggle("splitLongMessages")}
                className={`flex-shrink-0 relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  behavior.splitLongMessages ? "bg-emerald-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    behavior.splitLongMessages ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Link Preview */}
          <div className="p-4 rounded-lg border border-[#374151] bg-[#1F2937]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Vista Previa de Links</h3>
                <p className="text-sm text-gray-400">
                  Muestra una vista previa con título, descripción e imagen cuando envías un link.
                  El contacto verá una tarjeta con información del sitio.
                </p>
              </div>
              <button
                onClick={() => handleToggle("linkPreview")}
                className={`flex-shrink-0 relative inline-flex h-6 w-11 rounded-full transition-colors ${
                  behavior.linkPreview ? "bg-emerald-500" : "bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    behavior.linkPreview ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 mb-6">
          <p className="text-sm">
            💡 <strong>Consejo:</strong> Estos ajustes se aplican a todos los contactos en WhatsApp.
            Cambios se guardan automáticamente en las credenciales del canal.
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </div>
  );
}
