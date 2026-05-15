import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Zap,
  BarChart3,
  Users,
  ArrowRight,
  Check,
  ChevronDown,
  Star,
} from "lucide-react";
import { LandingFaqAccordion } from "@/components/marketing/LandingFaqAccordion";
import { LandingNavbar } from "@/components/marketing/LandingNavbar";
import { FloatingWhatsAppButton } from "@/components/marketing/FloatingWhatsAppButton";

export const metadata: Metadata = {
  title: "Complexa CRM — CRM Omnicanal con IA para PyMEs",
};

const CHANNELS = [
  {
    name: "WhatsApp",
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    color: "#E4405F",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    color: "#26A5E4",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    name: "Email",
    color: "#EA4335",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    color: "#000000",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    name: "WebChat",
    color: "#10B981",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-1 13H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V9h10v2z" />
      </svg>
    ),
  },
  {
    name: "Voice AI",
    color: "#8B5CF6",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
        <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm0 14a7 7 0 0 0 7-7h2a9 9 0 0 1-8 8.94V22h-2v-4.06A9 9 0 0 1 3 9h2a7 7 0 0 0 7 7z" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Inbox Unificado",
    description:
      "Todos tus canales en una sola pantalla. WhatsApp, Instagram, Facebook, Telegram y más sin cambiar de app.",
  },
  {
    icon: Zap,
    title: "Flow Builder con IA",
    description:
      "Automatizá respuestas, calificá leads y cerrá ventas sin escribir código. Arrastrá y soltá.",
  },
  {
    icon: BarChart3,
    title: "Analytics en Tiempo Real",
    description:
      "Métricas de conversación, performance de agentes, tasa de respuesta y más. Todo en vivo.",
  },
  {
    icon: Users,
    title: "Pipeline de Ventas",
    description:
      "Kanban visual para seguir cada deal. Arrastrá oportunidades entre etapas con un solo clic.",
  },
];

const PRICING_PLANS = [
  {
    name: "Starter",
    price: "$15000",
    period: "para siempre",
    description: "Perfecto para empezar a organizar tu negocio",
    highlight: false,
    features: [
      "1 miembro del equipo",
      "3 flows de automatización",
      "2 canales de mensajería",
      "500 conversaciones / mes",
      "Inbox + Pipeline básico",
      "5 plantillas",
      'Branding "Powered by Complexa CRM"',
    ],
    cta: "Registrarme",
    href: "/register",
  },
  {
    name: "Growth",
    price: "$49000",
    period: "por mes",
    description: "Para equipos que quieren escalar sin límites",
    highlight: true,
    badge: "Más popular",
    features: [
      "5 miembros del equipo",
      "Flows ilimitados",
      "10 canales de mensajería",
      "Conversaciones ilimitadas",
      "Analytics + Reports completos",
      "Campaigns (5.000/mes)",
      "Transcripción de audio (Whisper)",
      "Sin branding de Complexa CRM",
      "API Access",
      "Integraciones de calendario",
    ],
    cta: "Registrarme",
    href: "/register?plan=growth",
  },
  {
    name: "Business",
    price: "$149000",
    period: "por mes",
    description: "Para empresas con necesidades avanzadas",
    highlight: false,
    features: [
      "Todo lo de Growth, más:",
      "Equipo ilimitado",
      "Múltiples pipelines",
      "AI Credentials propias",
      "Custom CSS / JS",
      "Inbox Embedding",
      "Backup & Restore",
      "Roles y permisos avanzados",
      "Volume Heatmap + CSAT",
      "Reportes SLA",
      "Soporte prioritario",
      "White-label disponible",
    ],
    cta: "Hablar con ventas",
    href: "/register?plan=business",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Funciona con WhatsApp Business API oficial?",
    answer:
      "Sí. Complexa CRM integra tanto la API oficial de Meta (WhatsApp Cloud API) como WhatsApp QR (no oficial con Baileys). Podés conectar ambas en el mismo inbox.",
  },
  {
    question: "¿Necesito saber programar para usar el Flow Builder?",
    answer:
      "No. El Flow Builder es 100% visual: arrastrás nodos, configurás condiciones y conectás bloques sin escribir una sola línea de código. Si querés usarlo con IA, solo pegás tu API key.",
  },
  {
    question: "¿Cómo funciona el plan gratuito?",
    answer:
      "El plan Starter es gratis para siempre con 1 usuario, 2 canales y 500 conversaciones por mes. Incluye branding 'Powered by Complexa CRM'. Podés upgradear en cualquier momento.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Totalmente. Usamos Supabase con aislamiento de datos por empresa (schema-per-tenant), encriptación AES-256-GCM para credenciales, HMAC-SHA256 para webhooks, y autenticación JWT con Supabase Auth.",
  },
  {
    question: "¿Puedo cambiar de plan cuando quiera?",
    answer:
      "Sí. Podés upgradar o downgradar tu plan en cualquier momento desde Settings > Billing. Los cambios se aplican inmediatamente y el billing se proratea automáticamente.",
  },
  {
    question: "¿Qué proveedores de IA son compatibles?",
    answer:
      "Complexa CRM integra Anthropic Claude (Haiku / Sonnet), OpenAI GPT-4o, Google Gemini y OpenRouter. Podés configurar un proveedor principal y uno de fallback automático.",
  },
  {
    question: "¿Tienen soporte para LATAM?",
    answer:
      "Sí. La plataforma está en español por defecto, los precios están en USD accesibles para el mercado latinoamericano, y el soporte responde en español e inglés.",
  },
  {
    question: "¿Hay API pública?",
    answer:
      "Sí, en planes Growth y Business. Podés generar API keys desde Settings > API Access y consultar la documentación OpenAPI auto-generada.",
  },
];

const STATS = [
  { value: "8+", label: "canales conectados" },
  { value: "99.9%", label: "uptime garantizado" },
  { value: "<500ms", label: "latencia P95" },
  { value: "3", label: "proveedores de IA" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-[#F9FAFB]">
      <LandingNavbar />
      <FloatingWhatsAppButton />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 px-4">
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl" />

        <div className="relative mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-emerald-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Nuevo: Integración con TikTok Business Messaging</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            Todos tus chats,{" "}
            <span className="text-gradient-emerald">un solo inbox</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Centralizá WhatsApp, Instagram, Facebook, Telegram y más en un solo
            lugar. Automatizá con IA. Cerrá más ventas. Sin código.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 glow-emerald hover:glow-emerald-strong cursor-pointer text-lg"
            >
              Prueba la demo gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 glass hover:bg-[#1F2937] text-gray-300 hover:text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 cursor-pointer text-lg"
            >
              Ver planes
            </Link>
          </div>

          {/* Channel logos grid */}
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {CHANNELS.map((channel) => (
              <div
                key={channel.name}
                className="glass rounded-xl px-4 py-3 flex items-center gap-2 hover:border-emerald-500/40 transition-all duration-200 cursor-default group"
                title={channel.name}
              >
                <span
                  style={{ color: channel.color }}
                  className="transition-transform duration-200 group-hover:scale-110"
                >
                  {channel.icon}
                </span>
                <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors duration-200">
                  {channel.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-[#374151]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-gradient-emerald mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Todo lo que necesitás,{" "}
              <span className="text-gradient-emerald">nada que sobre</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Diseñado para PyMEs y emprendedores. Simple de usar, poderoso
              cuando lo necesitás.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="glass rounded-2xl p-6 hover:border-emerald-500/40 transition-all duration-300 group cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI section */}
      <section className="py-24 px-4 bg-[#1F2937]/50">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 text-sm text-emerald-400 mb-6">
                <Zap className="w-4 h-4" />
                Inteligencia Artificial integrada
              </div>
              <h2 className="text-4xl font-bold mb-6">
                IA de{" "}
                <span className="text-gradient-emerald">múltiples proveedores</span>{" "}
                con fallback automático
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                Configurá Claude, GPT-4o, Gemini o OpenRouter como tu proveedor
                principal. Si falla uno, Complexa CRM cambia al siguiente
                automáticamente, sin interrupciones para tus clientes.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Respuestas automáticas en el Flow Builder",
                  "Transcripción de audio con Whisper",
                  "Análisis de sentimiento y clasificación",
                  "Logs de uso y costos por proveedor",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 glow-emerald">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 ml-2 font-mono">
                  AI Response Service
                </span>
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 flex-shrink-0">→</span>
                  <span className="text-gray-300">
                    Proveedor:{" "}
                    <span className="text-emerald-400">Claude Haiku</span>
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 flex-shrink-0">→</span>
                  <span className="text-gray-300">
                    Fallback:{" "}
                    <span className="text-yellow-400">GPT-4o Mini</span>
                  </span>
                </div>
                <div className="border-t border-[#374151] pt-4 mt-4">
                  <div className="text-gray-500 mb-2">Respuesta generada:</div>
                  <div className="text-gray-200 leading-relaxed">
                    &ldquo;¡Hola! Gracias por contactarnos. Nuestro horario de
                    atención es de 9 a 18hs. ¿En qué podemos ayudarte?&rdquo;
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-[#374151]">
                  <span>Tokens: 47 input / 38 output</span>
                  <span className="text-emerald-400">✓ 234ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Precios{" "}
              <span className="text-gradient-emerald">transparentes</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Sin sorpresas. Sin costos ocultos. Cancelá cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 relative flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? "bg-emerald-500/10 border-2 border-emerald-500/60 glow-emerald scale-[1.02]"
                    : "glass hover:border-emerald-500/30"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-200 cursor-pointer block ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white glow-emerald"
                      : "glass hover:bg-[#374151] text-gray-200 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            Todos los planes incluyen SSL, backups automáticos y soporte por
            email. Sin costos de setup.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4 bg-[#1F2937]/50">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Preguntas{" "}
              <span className="text-gradient-emerald">frecuentes</span>
            </h2>
          </div>
          <LandingFaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass rounded-3xl p-12 glow-emerald-strong relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            <div className="relative">
              <h2 className="text-4xl font-bold mb-4">
                ¿Listo para centralizar tus mensajes?
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Demo gratis hoy. Sin tarjeta de crédito. Sin límite de tiempo.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 glow-emerald cursor-pointer text-lg"
              >
                Prueba la Demo gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#374151] py-12 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold">Complexa CRM</span>
              </div>
              <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                CRM omnicanal con IA para PyMEs y emprendedores latinoamericanos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#features" className="hover:text-emerald-400 transition-colors cursor-pointer">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-emerald-400 transition-colors cursor-pointer">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-emerald-400 transition-colors cursor-pointer">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors cursor-pointer">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors cursor-pointer">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#374151] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 Complexa CRM. Todos los derechos reservados.
            </p>
            <p className="text-gray-600 text-xs">
              Construido para Complexa IA
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
