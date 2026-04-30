"use client";

import { useState } from "react";
import { useAgentPerformance, useChannelSla, useCsatReport } from "@/hooks/useAnalytics";
import { FileText, Download } from "lucide-react";

function exportToCsv(filename: string, data: Array<Record<string, unknown>>) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const strValue = String(value ?? "");
          return `"${strValue.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const element = document.createElement("a");
  element.setAttribute("href", `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`);
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "90days">("30days");

  const getDatesFromRange = (range: "7days" | "30days" | "90days") => {
    const endDate = new Date();
    const startDate = new Date();
    const days = range === "7days" ? 7 : range === "30days" ? 30 : 90;
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  };

  const dates = getDatesFromRange(dateRange);
  const agentsQuery = useAgentPerformance(dates);
  const slaQuery = useChannelSla(dates);
  const csatQuery = useCsatReport(dates);

  const isLoading = agentsQuery.isLoading || slaQuery.isLoading || csatQuery.isLoading;

  return (
    <div className="h-full bg-[#111827] overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold">Reportes</h1>
          </div>
          <p className="text-[#9CA3AF]">Reportes detallados de desempeño y métricas operacionales</p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2 mb-8">
          {(["7days", "30days", "90days"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? "bg-emerald-500 text-white"
                  : "bg-[#1F2937] border border-[#374151] text-gray-400 hover:border-emerald-500/50"
              }`}
            >
              {range === "7days" ? "7 días" : range === "30days" ? "30 días" : "90 días"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-400">Cargando reportes...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Agent Performance Report */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Desempeño de Agentes</h2>
                {agentsQuery.data && agentsQuery.data.length > 0 && (
                  <button
                    onClick={() => {
                      const csvData = agentsQuery.data!.map((agent) => ({
                        "Agente ID": agent.agentId,
                        "Conversaciones Asignadas": agent.assignedConversations,
                        "Mensajes Manejados": agent.messagesHandled,
                        "Tiempo Promedio (min)": agent.avgResponseTimeMinutes.toFixed(2),
                      }));
                      exportToCsv("reporte-agentes.csv", csvData);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </button>
                )}
              </div>

              {agentsQuery.data && agentsQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#374151]">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Agente</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Conversaciones</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Mensajes</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Tiempo Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentsQuery.data.map((agent) => (
                        <tr key={agent.agentId} className="border-b border-[#374151] hover:bg-[#111827]">
                          <td className="py-3 px-4 text-white">{agent.agentId}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{agent.assignedConversations}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{agent.messagesHandled}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{agent.avgResponseTimeMinutes.toFixed(2)} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Sin datos disponibles</p>
              )}
            </div>

            {/* Channel SLA Report */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Reporte SLA por Canal</h2>
                {slaQuery.data && slaQuery.data.length > 0 && (
                  <button
                    onClick={() => {
                      const csvData = slaQuery.data!.map((sla) => ({
                        Canal: sla.channel,
                        "Total Conversaciones": sla.totalConversations,
                        "Tiempo Respuesta (min)": sla.avgResponseTimeMinutes.toFixed(2),
                        "Tiempo Resolución (h)": sla.avgResolutionTimeHours.toFixed(2),
                        "SLA Cumplimiento (%)": sla.slaCompliancePercentage.toFixed(2),
                      }));
                      exportToCsv("reporte-sla.csv", csvData);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                  </button>
                )}
              </div>

              {slaQuery.data && slaQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#374151]">
                        <th className="text-left py-3 px-4 text-gray-400 font-semibold">Canal</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Conversaciones</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Respuesta</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">Resolución</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-semibold">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaQuery.data.map((sla) => (
                        <tr key={sla.channel} className="border-b border-[#374151] hover:bg-[#111827]">
                          <td className="py-3 px-4 text-white capitalize">{sla.channel}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{sla.totalConversations}</td>
                          <td className="text-right py-3 px-4 text-gray-300">{sla.avgResponseTimeMinutes.toFixed(2)} min</td>
                          <td className="text-right py-3 px-4 text-gray-300">{sla.avgResolutionTimeHours.toFixed(2)} h</td>
                          <td className="text-right py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              sla.slaCompliancePercentage >= 95
                                ? "bg-emerald-500/20 text-emerald-300"
                                : sla.slaCompliancePercentage >= 80
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-red-500/20 text-red-300"
                            }`}>
                              {sla.slaCompliancePercentage.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Sin datos disponibles</p>
              )}
            </div>

            {/* CSAT Report */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Reporte CSAT</h2>

              {csatQuery.data ? (
                <div className="space-y-6">
                  {/* CSAT Average */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#111827] border border-[#374151] rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-2">Satisfacción Promedio</p>
                      <p className="text-4xl font-bold text-emerald-400">{csatQuery.data.averageCsat.toFixed(2)}</p>
                      <p className="text-gray-400 text-sm mt-2">de 5 estrellas</p>
                    </div>

                    <div className="bg-[#111827] border border-[#374151] rounded-lg p-6">
                      <p className="text-gray-400 text-sm mb-2">Total de Ratings</p>
                      <p className="text-4xl font-bold text-blue-400">{csatQuery.data.totalRatings}</p>
                      <p className="text-gray-400 text-sm mt-2">respuestas registradas</p>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div>
                    <h3 className="text-white font-semibold mb-4">Distribución de Ratings</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <div key={rating} className="bg-[#111827] border border-[#374151] rounded-lg p-4 text-center">
                          <p className="text-gray-400 text-sm mb-2">{rating} ⭐</p>
                          <p className="text-2xl font-bold text-white">{csatQuery.data.byRating[rating] || 0}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* By Channel */}
                  <div>
                    <h3 className="text-white font-semibold mb-4">CSAT por Canal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(csatQuery.data.byChannel).map(([channel, score]) => (
                        <div key={channel} className="bg-[#111827] border border-[#374151] rounded-lg p-4">
                          <p className="text-gray-400 text-sm capitalize mb-2">{channel}</p>
                          <p className="text-2xl font-bold text-emerald-400">{(score as number).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Sin datos disponibles</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
