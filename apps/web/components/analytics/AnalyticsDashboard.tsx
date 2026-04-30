"use client";

import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useConversationMetrics, useVolumeHeatmap } from "@/hooks/useAnalytics";
import { MessageCircle, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

type DateRange = "7days" | "30days" | "90days";

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("7days");

  const getDatesFromRange = (range: DateRange) => {
    const endDate = new Date();
    const startDate = new Date();
    const days = range === "7days" ? 7 : range === "30days" ? 30 : 90;
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  };

  const dates = getDatesFromRange(dateRange);
  const conversationQuery = useConversationMetrics(dates);
  const heatmapQuery = useVolumeHeatmap(dates.startDate, dates.endDate);

  const metrics = conversationQuery.data;
  const heatmapData = heatmapQuery.data || [];

  // Collapse heatmap data by date
  const collapsedHeatmap = heatmapData.reduce(
    (acc, item) => {
      const existing = acc.find((x) => x.date === item.date);
      if (existing) {
        existing.messages += item.messageCount;
      } else {
        acc.push({ date: item.date, messages: item.messageCount });
      }
      return acc;
    },
    [] as Array<{ date: string; messages: number }>
  );

  // Channel pie data
  const channelData = metrics
    ? Object.entries(metrics.byChannel).map(([channel, count]) => ({
        name: channel,
        value: count,
      }))
    : [];

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

  if (conversationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Cargando métricas...</p>
      </div>
    );
  }

  if (conversationQuery.isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
        Error al cargar las métricas. Por favor intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex gap-2">
        {(["7days", "30days", "90days"] as DateRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              dateRange === range
                ? "bg-emerald-500 text-white"
                : "bg-[#1F2937] border border-[#374151] text-gray-400 hover:border-emerald-500/50"
            }`}
          >
            {range === "7days" ? "Últimos 7 días" : range === "30days" ? "Últimos 30 días" : "Últimos 90 días"}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Conversaciones</p>
              <p className="text-3xl font-bold text-white">{metrics?.totalConversations || 0}</p>
            </div>
            <MessageCircle className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Conversaciones Abiertas</p>
              <p className="text-3xl font-bold text-white">{metrics?.openConversations || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-400 opacity-50" />
          </div>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Conversaciones Cerradas</p>
              <p className="text-3xl font-bold text-white">{metrics?.closedConversations || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-50" />
          </div>
        </div>

        <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Promedio Mensajes</p>
              <p className="text-3xl font-bold text-white">{metrics?.avgMessagesPerConversation.toFixed(1) || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        {channelData.length > 0 && (
          <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">Distribución por Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Volume Heatmap */}
        {collapsedHeatmap.length > 0 && (
          <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">Volumen de Mensajes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={collapsedHeatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="messages" stroke="#10B981" strokeWidth={2} dot={{ fill: "#10B981", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Channel Bar Chart */}
      {channelData.length > 0 && (
        <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">Conversaciones por Canal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: "12px" }} />
              <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
              <Bar dataKey="value" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
