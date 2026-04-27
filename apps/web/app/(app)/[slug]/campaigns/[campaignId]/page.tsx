import { CampaignMetricsDashboard } from "@/components/campaigns/CampaignMetricsDashboard";

type Props = {
  params: Promise<{ slug: string; campaignId: string }>;
};

export default async function CampaignDetailPage({ params }: Props) {
  const { campaignId } = await params;
  return (
    <div className="h-full bg-[#111827] overflow-hidden">
      <CampaignMetricsDashboard campaignId={campaignId} />
    </div>
  );
}
