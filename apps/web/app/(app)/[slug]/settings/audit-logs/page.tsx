"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";

export default function AuditLogsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { logs, isLoading, page, setPage, hasMore } = useAuditLogs();

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      "org.created": "Organización creada",
      "org.updated": "Organización actualizada",
      "organization.client_db_connected": "BD del cliente conectada",
      "organization.setup_completed": "Setup completado",
      "user.created": "Usuario creado",
      "user.updated": "Usuario actualizado",
      "user.deleted": "Usuario eliminado",
      "team.member_invited": "Miembro invitado",
      "team.member_role_changed": "Rol de miembro cambiado",
      "team.member_removed": "Miembro removido",
      "api_key.created": "API key creada",
      "api_key.revoked": "API key revocada",
      "backup.created": "Backup creado",
      "backup.restored": "Backup restaurado",
      "backup.deleted": "Backup eliminado",
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action.includes("created") || action.includes("invited")) {
      return "bg-emerald-500/20 text-emerald-300";
    }
    if (action.includes("deleted") || action.includes("removed")) {
      return "bg-red-500/20 text-red-300";
    }
    if (action.includes("updated") || action.includes("changed")) {
      return "bg-blue-500/20 text-blue-300";
    }
    return "bg-gray-500/20 text-gray-300";
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${slug}/settings`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Logs de Auditoría</h1>
            <p className="text-gray-400">Registro de todas las acciones realizadas en la cuenta</p>
          </div>
        </div>

        {/* Logs List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">Cargando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay logs de auditoría</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-[#1F2937] border border-[#374151] rounded-lg p-4 hover:border-[#4B5563] transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Action and details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                      {log.resourceType && (
                        <span className="text-xs text-gray-400">
                          {log.resourceType}
                          {log.resourceId && ` #${log.resourceId.slice(0, 8)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {log.userId && (
                        <span>Usuario: {log.userId.slice(0, 8)}</span>
                      )}
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && logs.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-[#374151] hover:border-[#4B5563] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400">
              Página {page + 1}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className="p-2 rounded-lg border border-[#374151] hover:border-[#4B5563] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
