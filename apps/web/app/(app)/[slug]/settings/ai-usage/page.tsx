"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAiUsageSummary } from "@/hooks/useAiUsage";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AiUsagePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);
    return { startDate, endDate };
  }, [period]);

  const { data, isLoading } = useAiUsageSummary(dateRange);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
        <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    errorRate: 0,
  };

  const byProvider = data?.byProvider || [];
  const byModel = data?.byModel || [];
  const dailyTimeline = data?.dailyTimeline || [];

  const hasData = summary.totalRequests > 0;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back Link */}
        <Link href={`/${slug}/settings`} className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Configuración</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Uso de IA</h1>
          <p className="text-gray-400">Monitorea tu consumo de APIs de inteligencia artificial</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === 7
                ? "bg-emerald-500 text-white"
                : "bg-[#1F2937] border border-[#374151] text-gray-300 hover:border-emerald-500/50"
            }`}
          >
            7 días
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === 30
                ? "bg-emerald-500 text-white"
                : "bg-[#1F2937] border border-[#374151] text-gray-300 hover:border-emerald-500/50"
            }`}
          >
            30 días
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === 90
                ? "bg-emerald-500 text-white"
                : "bg-[#1F2937] border border-[#374151] text-gray-300 hover:border-emerald-500/50"
            }`}
          >
            90 días
          </button>
        </div>

        {!hasData ? (
          <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aún no hay registros de uso de IA</p>
            <p className="text-gray-600 text-sm mt-2">Usa el Flow Builder con nodos AI Response para generar registros</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                <p className="text-gray-400 text-sm font-medium mb-2">Requests Totales</p>
                <p className="text-3xl font-bold text-white">{summary.totalRequests}</p>
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                <p className="text-gray-400 text-sm font-medium mb-2">Tokens Totales</p>
                <p className="text-3xl font-bold text-white">{summary.totalTokens.toLocaleString()}</p>
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                <p className="text-gray-400 text-sm font-medium mb-2">Costo Estimado</p>
                <p className="text-3xl font-bold text-white">${summary.estimatedCostUsd.toFixed(2)}</p>
              </div>
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                <p className="text-gray-400 text-sm font-medium mb-2">Tasa de Error</p>
                <p className={`text-3xl font-bold ${summary.errorRate > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {summary.errorRate.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Provider Distribution */}
              {byProvider.length > 0 && (
                <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Tokens por Proveedor</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byProvider}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="provider" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
                      <Bar dataKey="totalTokens" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Daily Timeline */}
              {dailyTimeline.length > 0 && (
                <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Requests Diarios</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailyTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
                      <Line type="monotone" dataKey="requests" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Models Table */}
            {byModel.length > 0 && (
              <div className="bg-[#1F2937] border border-[#374151] rounded-lg overflow-hidden">
                <div className="p-6 border-b border-[#374151]">
                  <h3 className="text-lg font-semibold text-white">Uso por Modelo</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#374151] bg-[#111827]">
                        <th className="px-6 py-3 text-left font-medium text-gray-300">Modelo</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-300">Proveedor</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-300">Requests</th>
                        <th className="px-6 py-3 text-right font-medium text-gray-300">Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byModel.map((row) => (
                        <tr key={`${row.model}-${row.provider}`} className="border-b border-[#374151] hover:bg-[#111827]/50">
                          <td className="px-6 py-3 text-white">{row.model}</td>
                          <td className="px-6 py-3 text-gray-400">{row.provider}</td>
                          <td className="px-6 py-3 text-right text-gray-300">{row.requests}</td>
                          <td className="px-6 py-3 text-right text-gray-300">{row.totalTokens.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
