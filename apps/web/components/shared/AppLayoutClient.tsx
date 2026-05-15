"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { AppTopbar } from "@/components/shared/AppTopbar";
import { TrialBanner } from "@/components/shared/TrialBanner";
import { PlanLimitBanner } from "@/components/shared/PlanLimitBanner";
import { SetupGuard } from "@/components/setup/SetupGuard";
import { ComplexaFooter } from "@/components/shared/ComplexaFooter";

type AppLayoutClientProps = {
  slug: string;
  children: React.ReactNode;
};

export function AppLayoutClient({ slug, children }: AppLayoutClientProps) {
  const pathname = usePathname();
  // Detect if we're in setup route: /[slug]/setup or /[slug]/setup/*
  const isSetupRoute = pathname.includes("/setup");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#111827] relative flex-col">
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Only render sidebar during normal operations, not during setup */}
        {!isSetupRoute && <AppSidebar slug={slug} />}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Only render topbar during normal operations, not during setup */}
          {!isSetupRoute && <AppTopbar slug={slug} />}
          {!isSetupRoute && <TrialBanner slug={slug} />}
          {!isSetupRoute && <PlanLimitBanner />}

          {/* SetupGuard is safe - it's designed for setup detection */}
          <SetupGuard />

          <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
        </div>
      </div>

      {/* Only show footer during normal operations */}
      {!isSetupRoute && <ComplexaFooter />}
    </div>
  );
}
