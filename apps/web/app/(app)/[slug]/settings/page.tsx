"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, MessageSquare, Zap, Users, CreditCard, Key, FileText, Settings as SettingsIcon, Sparkles, BarChart3, Palette } from "lucide-react";
import { useBillingStatus } from "@/hooks/useBillingStatus";

type SettingsCard = {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  comingSoon?: boolean;
};

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: billingData } = useBillingStatus();
  const plan = billingData?.plan;

  const settingsCards: SettingsCard[] = [
    {
      label: "Canales",
      description: "Conecta WhatsApp, Telegram, Instagram, Facebook y más",
      href: `/settings/channels`,
      icon: Zap,
    },
    {
      label: "Email",
      description: "Configura SMTP o Resend para envío de emails",
      href: `/settings/email`,
      icon: Mail,
    },
    {
      label: "Comportamiento WhatsApp",
      description: "Typing indicators, divisor de mensajes, link preview",
      href: `/settings/whatsapp-behavior`,
      icon: MessageSquare,
    },
    {
      label: "Credenciales de IA",
      description: "Configura API keys para Anthropic, OpenAI, Gemini y más",
      href: `/settings/ai-credentials`,
      icon: Sparkles,
    },
    {
      label: "Uso de IA",
      description: "Monitorea tokens, costos y requests de APIs de IA",
      href: `/settings/ai-usage`,
      icon: BarChart3,
    },
    {
      label: "Campos Personalizados",
      description: "Crea campos extra para Contactos y Deals",
      href: `/settings/custom-fields`,
      icon: SettingsIcon,
      comingSoon: true,
    },
    {
      label: "Equipo",
      description: "Invita miembros, asigna roles y permisos",
      href: `/settings/team`,
      icon: Users,
    },
    {
      label: "Facturación",
      description: "Plan actual, próxima factura, upgrade/downgrade",
      href: `/settings/billing`,
      icon: CreditCard,
    },
    {
      label: "Acceso API",
      description: "Genera y revoca API keys, estadísticas de uso",
      href: `/settings/api-access`,
      icon: Key,
    },
    ...(plan === "business"
      ? [
          {
            label: "Marca",
            description: "Personaliza logo, colores y dominio",
            href: `/settings/branding`,
            icon: Palette,
          },
        ]
      : []),
    {
      label: "Generales",
      description: "Timezone, idioma, comportamiento general",
      href: `/settings/general`,
      icon: SettingsIcon,
      comingSoon: true,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
          <p className="text-gray-400">Personaliza tu cuenta y conecta tus canales de comunicación</p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            const href = `/${slug}${card.href}`;

            if (card.comingSoon) {
              return (
                <div
                  key={card.label}
                  className="relative p-5 rounded-lg border border-[#374151] bg-[#1F2937]/50 cursor-not-allowed opacity-60"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Icon className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-300">{card.label}</h3>
                      <div className="absolute top-3 right-3">
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                          Próximamente
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </div>
              );
            }

            return (
              <Link
                key={card.label}
                href={href}
                className="group p-5 rounded-lg border border-[#374151] bg-[#1F2937] hover:border-emerald-500/50 hover:bg-[#1F2937]/80 transition-all duration-200"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Icon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 group-hover:text-emerald-300" />
                  <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                    {card.label}
                  </h3>
                </div>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
