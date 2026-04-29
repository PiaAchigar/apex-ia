"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Phone, Check, X } from "lucide-react";
import type { CallLog } from "@/hooks/useCallLogs";

type CallLogTableProps = {
  logs: CallLog[];
  page: number;
  onPageChange: (page: number) => void;
  total: number;
  limit: number;
  isLoading?: boolean;
};

export function CallLogTable({
  logs,
  page,
  onPageChange,
  total,
  limit,
  isLoading = false,
}: CallLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9CA3AF]">
        Cargando registros de llamadas...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Phone className="w-12 h-12 text-[#374151] mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No hay llamadas registradas aún
        </h3>
        <p className="text-sm text-[#9CA3AF]">
          Los registros de llamadas aparecerán aquí cuando realices llamadas con
          IA.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#1F2937] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#374151] bg-[#111827]">
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Contacto ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Duración
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Estado
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Modelo IA
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Tokens
              </th>
              <th className="px-4 py-3 text-left font-semibold text-[#9CA3AF]">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tbody key={log.id}>
                <tr
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                  className="border-b border-[#374151] hover:bg-[#111827] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    {log.contactId.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    {formatDuration(log.duration)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {log.isSuccess ? (
                        <Check className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <X className="w-4 h-4 text-[#EF4444]" />
                      )}
                      <span className={log.isSuccess ? "text-[#10B981]" : "text-[#EF4444]"}>
                        {log.isSuccess ? "Exitosa" : "Falló"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    {log.aiModel || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    {log.tokensUsed || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#D1D5DB]">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>

                {/* Expanded transcript row */}
                {expandedId === log.id && log.transcript && (
                  <tr className="border-b border-[#374151] bg-[#111827]">
                    <td colSpan={6} className="px-4 py-4">
                      <div>
                        <h4 className="font-semibold mb-2 text-[#D1D5DB]">
                          Transcripción:
                        </h4>
                        <p className="text-sm text-[#9CA3AF] leading-relaxed">
                          {log.transcript}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9CA3AF]">
          Página {page} de {totalPages} • Total: {total} llamadas
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    page === pageNum
                      ? "bg-[#10B981] text-white"
                      : "hover:bg-[#374151]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 hover:bg-[#374151] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
