"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";

type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";

type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: CampaignStatus;
  messageContent: string;
  targetCount: number | null;
  sentCount: number | null;
  failedCount: number | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type Metrics = {
  campaignId: string;
  status: string;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  deliveryRate: number;
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  running: "Enviando",
  paused: "Pausada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const STATUS_CLASSES: Record<CampaignStatus, string> = {
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

type MetricCardProps = {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
};

function MetricCard({ icon: Icon, label, value, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

type CampaignMetricsDashboardProps = {
  campaignId: string;
};

export function CampaignMetricsDashboard({ campaignId }: CampaignMetricsDashboardProps) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading: loadingCampaign } = useQuery<Campaign>({
    queryKey: ["campaign", campaignId],
    queryFn: () => apiClient.get<Campaign>(`/campaigns/${campaignId}`),
    staleTime: 15_000,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 5000 : false,
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery<Metrics>({
    queryKey: ["campaign-metrics", campaignId],
    queryFn: () => apiClient.get<Metrics>(`/campaigns/${campaignId}/metrics`),
    staleTime: 10_000,
    refetchInterval: (query) => {
      const status = campaign?.status;
      return status === "running" ? 5000 : false;
    },
  });

  const isLoading = loadingCampaign || loadingMetrics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-gray-500">Campaña no encontrada</p>
        <button
          onClick={() => router.push(`/${params.slug}/campaigns`)}
          className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
        >
          Volver a campañas
        </button>
      </div>
    );
  }

  const deliveryRate = metrics?.deliveryRate ?? 0;

  return (
    <div className="h-full flex flex-col bg-[#111827] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#374151] flex-shrink-0">
        <button
          onClick={() => router.push(`/${params.slug}/campaigns`)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#374151] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-100 truncate">{campaign.name}</h1>
          <span
            className={`inline-block text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
              STATUS_CLASSES[campaign.status] ?? STATUS_CLASSES.draft
            }`}
          >
            {STATUS_LABELS[campaign.status] ?? campaign.status}
          </span>
        </div>
        {campaign.status === "running" && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Activity className="w-3 h-3 animate-pulse" />
            En vivo
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Send}
            label="Total destinatarios"
            value={metrics?.targetCount ?? 0}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Enviados"
            value={metrics?.sentCount ?? 0}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
          <MetricCard
            icon={XCircle}
            label="Fallidos"
            value={metrics?.failedCount ?? 0}
            color="text-red-400"
            bgColor="bg-red-500/10"
          />
          <MetricCard
            icon={Clock}
            label="Pendientes"
            value={metrics?.pendingCount ?? 0}
            color="text-amber-400"
            bgColor="bg-amber-500/10"
          />
        </div>

        {/* Delivery rate bar */}
        {(metrics?.targetCount ?? 0) > 0 && (
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Tasa de entrega</h3>
              <span className="text-xl font-bold text-emerald-400">{deliveryRate}%</span>
            </div>
            <div className="h-2 bg-[#374151] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${deliveryRate}%` }}
              />
            </div>
            {metrics?.failedCount != null && metrics.failedCount > 0 && (
              <div className="mt-2 h-1 bg-[#374151] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500/60 rounded-full"
                  style={{
                    width: `${Math.round(
                      ((metrics.failedCount ?? 0) / (metrics.targetCount || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Message preview */}
        <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Mensaje</h3>
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{campaign.messageContent}</p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          {campaign.scheduledAt && (
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
              <p className="text-gray-500 mb-1">Programada para</p>
              <p className="text-gray-200">
                {new Date(campaign.scheduledAt).toLocaleString("es", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          {campaign.completedAt && (
            <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
              <p className="text-gray-500 mb-1">Completada</p>
              <p className="text-gray-200">
                {new Date(campaign.completedAt).toLocaleString("es", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
          <div className="bg-[#1F2937] rounded-xl border border-[#374151] p-4">
            <p className="text-gray-500 mb-1">Creada</p>
            <p className="text-gray-200">
              {campaign.createdAt
                ? new Date(campaign.createdAt).toLocaleString("es", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
