"use client";

import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { AiUsageChart } from "@/components/analytics/AiUsageChart";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="h-full bg-[#111827] overflow-auto">
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold">Analytics</h1>
          </div>
          <p className="text-[#9CA3AF]">Métricas en tiempo real de tus conversaciones y desempeño</p>
        </div>

        <div className="space-y-8">
          <AnalyticsDashboard />
          <AiUsageChart />
        </div>
      </div>
    </div>
  );
}
