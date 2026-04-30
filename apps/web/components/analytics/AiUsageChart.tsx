"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle } from "lucide-react";

export function AiUsageChart() {
  // Placeholder data for tokens used
  const data = [
    { date: "Hoy", tokens: 2500 },
    { date: "Ayer", tokens: 3200 },
    { date: "Hace 2 días", tokens: 1800 },
    { date: "Hace 3 días", tokens: 4100 },
    { date: "Hace 4 días", tokens: 2900 },
    { date: "Hace 5 días", tokens: 3600 },
    { date: "Hace 6 días", tokens: 2200 },
  ];

  return (
    <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
      <h3 className="text-white font-semibold mb-4">Consumo de Tokens AI</h3>

      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-blue-300 text-sm">
          El consumo de tokens se registra cuando usas IA para generar respuestas o analizar conversaciones.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: "12px" }} />
          <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
          <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }} />
          <Bar dataKey="tokens" fill="#3B82F6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-[#374151] rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Tokens Hoy</p>
          <p className="text-2xl font-bold text-white">2,500</p>
        </div>
        <div className="bg-[#111827] border border-[#374151] rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Costo Estimado</p>
          <p className="text-2xl font-bold text-white">$0.05</p>
        </div>
      </div>
    </div>
  );
}
