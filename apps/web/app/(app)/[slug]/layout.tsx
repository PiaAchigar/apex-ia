import type { Metadata } from "next";
import { QueryClientProvider } from "./QueryClientProvider";
import { AppLayoutClient } from "@/components/shared/AppLayoutClient";

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
      template: `%s — ${slug} | Complexa CRM`,
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
      <AppLayoutClient slug={slug}>
        {children}
      </AppLayoutClient>
    </QueryClientProvider>
  );
}
