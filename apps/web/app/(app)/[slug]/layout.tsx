import type { Metadata } from "next";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AppTopbar } from "@/components/shared/AppTopbar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { PlanLimitBanner } from "@/components/shared/PlanLimitBanner";
import { SetupGuard } from "@/components/setup/SetupGuard";
import { ComplexaFooter } from "@/components/shared/ComplexaFooter";
import { QueryClientProvider } from "./QueryClientProvider";

type AppLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: {
      default: "Inbox",
      template: `%s — ${slug} | Apex IA`,
    },
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { slug } = await params;

  return (
    <QueryClientProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#111827] relative flex-col">
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <AppSidebar slug={slug} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AppTopbar slug={slug} />
            <TrialBanner slug={slug} />
            <PlanLimitBanner />
            <SetupGuard />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
          </div>
        </div>
        <ComplexaFooter />
      </div>
    </QueryClientProvider>
  );
}
