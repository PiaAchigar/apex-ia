"use client";

import { CheckCircle, Circle } from "lucide-react";
import { useSetupStatus } from "@/hooks/useSetupStatus";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function SetupSettingsPage() {
  const { slug } = useParams() as { slug: string };
  const { isComplete, isLoading } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Cargando estado...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Configuración Inicial</h2>
        <p className="text-gray-400 mt-1">
          {isComplete
            ? "Tu cuenta está completamente configurada"
            : "Completa el setup para usar todas las funcionalidades"}
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Estado del Setup</h3>
            <p className="text-sm text-gray-400 mt-2">
              {isComplete ? "✅ Completado" : "⏳ Pendiente"}
            </p>
          </div>
          {!isComplete && (
            <Link
              href={`/${slug}/setup`}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Continuar Setup →
            </Link>
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pasos completados</h3>
        <div className="space-y-3">
          {[
            { label: "Base de datos conectada", done: isComplete },
            { label: "Schema inicializado", done: isComplete },
            { label: "Marca personalizada", done: isComplete },
            { label: "Canales conectados", done: isComplete },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.done ? (
                <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle size={18} className="text-gray-600 flex-shrink-0" />
              )}
              <span className={item.done ? "text-gray-300" : "text-gray-500"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      {isComplete && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-400">
            ✨ Tu empresa está lista para usar todas las funcionalidades.
          </p>
        </div>
      )}
    </div>
  );
}
