"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Mail, Send, AlertCircle } from "lucide-react";
import Link from "next/link";

type ChannelStatus = "connected" | "disconnected" | "error";

type Channel = {
  id: string;
  name: string;
  icon: React.ElementType;
  status: ChannelStatus;
  description: string;
};

export default function ChannelsSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [channels] = useState<Channel[]>([
    {
      id: "whatsapp-official",
      name: "WhatsApp Oficial",
      icon: MessageCircle,
      status: "disconnected",
      description: "Meta Cloud API - Números de negocio verificados",
    },
    {
      id: "instagram",
      name: "Instagram DM",
      icon: MessageCircle,
      status: "disconnected",
      description: "Meta Graph API - Mensajes directos",
    },
    {
      id: "facebook",
      name: "Facebook Messenger",
      icon: Send,
      status: "disconnected",
      description: "Meta Graph API - Mensajes de página",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: MessageCircle,
      status: "disconnected",
      description: "Telegraf Bot - Conversaciones directas",
    },
    {
      id: "email",
      name: "Email",
      icon: Mail,
      status: "disconnected",
      description: "SMTP / Resend - Envío y recepción",
    },
    {
      id: "tiktok",
      name: "TikTok Business",
      icon: MessageCircle,
      status: "disconnected",
      description: "TikTok Business Messaging API",
    },
  ]);

  const getStatusColor = (status: ChannelStatus) => {
    switch (status) {
      case "connected":
        return "bg-emerald-500/10 border-emerald-500/25 text-emerald-300";
      case "error":
        return "bg-red-500/10 border-red-500/25 text-red-300";
      case "disconnected":
        return "bg-gray-500/10 border-gray-500/25 text-gray-400";
    }
  };

  const getStatusLabel = (status: ChannelStatus) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "error":
        return "Error";
      case "disconnected":
        return "Desconectado";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/${slug}/settings`}
            className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
              Canales de Comunicación
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Conecta y configura tus canales de mensajería
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-300 mb-6">
          <p className="text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Cada canal requiere credenciales específicas de su proveedor. Consulta la documentación
              para obtener instrucciones de conexión.
            </span>
          </p>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 gap-4">
          {channels.map((channel) => {
            const Icon = channel.icon;

            return (
              <div
                key={channel.id}
                className="p-5 rounded-lg border border-[#374151] bg-[#1F2937] hover:border-[#4B5563] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-[#111827]">
                      <Icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{channel.name}</h3>
                      <p className="text-sm text-gray-400 mb-3">{channel.description}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(channel.status)}`}>
                        {getStatusLabel(channel.status)}
                      </div>
                    </div>
                  </div>

                  <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors flex-shrink-0">
                    Conectar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 rounded-lg bg-gray-900/50 border border-[#374151]">
          <p className="text-xs text-gray-500">
            <strong>Nota:</strong> La conexión a canales requiere que tengas cuentas activas en
            cada plataforma. Al conectar, autorizarás a Apex IA para acceder a tus mensajes y
            contactos en nombre de tu empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
