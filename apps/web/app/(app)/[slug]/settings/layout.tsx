import type { Metadata } from "next";
import Link from "next/link";

type SettingsLayoutProps = {
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
      default: "Configuración",
      template: `%s — ${slug} | Complexa CRM`,
    },
  };
}

const SETTINGS_TABS = [
  { href: "general", label: "General" },
  { href: "channels", label: "Canales" },
  { href: "branding", label: "Marca" },
  { href: "team", label: "Equipo" },
  { href: "billing", label: "Facturación" },
  { href: "setup", label: "Configuración Inicial" },
];

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
        <p className="text-gray-400">Personaliza tu espacio de trabajo</p>
      </div>

      <div className="border-b border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {SETTINGS_TABS.map((tab) => (
            <Link
              key={tab.href}
              href={`/${slug}/settings/${tab.href}`}
              className="px-4 py-3 text-sm font-medium text-gray-400 hover:text-white border-b-2 border-transparent hover:border-emerald-500 transition-colors whitespace-nowrap"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
