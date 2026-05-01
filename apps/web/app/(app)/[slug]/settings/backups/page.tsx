"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileArchive, Download, Trash2, Loader2 } from "lucide-react";
import { useBackups } from "@/hooks/useBackups";

export default function BackupsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { backups, isLoading, create, restore, remove } = useBackups();

  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    setError("");
    setCreating(true);
    try {
      await create();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error al crear backup";
      setError(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!window.confirm("¿Restaurar este backup? Los datos actuales serán reemplazados.")) {
      return;
    }

    setError("");
    setRestoringId(backupId);
    try {
      await restore(backupId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error al restaurar backup";
      setError(errMsg);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!window.confirm("¿Eliminar este backup? Esta acción no se puede deshacer.")) {
      return;
    }

    setError("");
    setDeleteId(backupId);
    try {
      await remove(backupId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error al eliminar backup";
      setError(errMsg);
    } finally {
      setDeleteId(null);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "Sin información";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              <h1 className="text-3xl font-bold text-white mb-2">Backups</h1>
              <p className="text-gray-400">Realiza y gestiona copias de seguridad</p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear backup
            </button>
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm">
            Operación completada correctamente
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Backups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">Cargando backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <FileArchive className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No hay backups todavía</p>
            <button
              onClick={handleCreate}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Crear el primer backup
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 flex items-center justify-between hover:border-[#4B5563] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <FileArchive className="w-5 h-5 text-emerald-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {backup.fileName}
                    </p>
                    <div className="flex gap-4 text-gray-400 text-sm">
                      <span>{formatDate(backup.createdAt)}</span>
                      <span>{formatFileSize(backup.sizeBytes)}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          backup.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        {backup.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleRestore(backup.id)}
                    disabled={restoringId === backup.id}
                    className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors text-amber-400 hover:text-amber-300 disabled:opacity-50 flex items-center gap-1"
                    title="Restaurar backup"
                  >
                    {restoringId === backup.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(backup.id)}
                    disabled={deletingId === backup.id}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300 disabled:opacity-50 flex items-center gap-1"
                    title="Eliminar backup"
                  >
                    {deletingId === backup.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
