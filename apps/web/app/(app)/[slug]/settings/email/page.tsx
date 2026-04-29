"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, AlertCircle, CheckCircle, Loader } from "lucide-react";
import Link from "next/link";

type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
};

type EmailProvider = "smtp" | "resend";

export default function EmailSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [provider, setProvider] = useState<EmailProvider>("smtp");
  const [config, setConfig] = useState<EmailConfig>({
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromName: "Apex IA",
  });
  const [resendKey, setResendKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "idle";
    message: string;
  }>({ type: "idle", message: "" });

  const handleConfigChange = (field: keyof EmailConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const res = await fetch(`/api/settings/channels/email/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (data.success) {
        setStatus({
          type: "success",
          message: "Conexión exitosa. Credenciales válidas.",
        });
      } else {
        setStatus({
          type: "error",
          message: data.error || "Error al probar la conexión",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const payload =
        provider === "smtp"
          ? { type: "smtp", config }
          : { type: "resend", apiKey: resendKey };

      const res = await fetch(`/api/settings/channels/email/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({
          type: "success",
          message: "Configuración guardada exitosamente",
        });
      } else {
        setStatus({
          type: "error",
          message: data.error || "Error al guardar la configuración",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-2xl mx-auto">
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
              <Mail className="w-6 h-6 text-emerald-400" />
              Configuración de Email
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configura SMTP o Resend para enviar y recibir emails
            </p>
          </div>
        </div>

        {/* Status Alert */}
        {status.type !== "idle" && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              status.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                : "bg-red-500/10 border-red-500/25 text-red-300"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{status.message}</p>
          </div>
        )}

        {/* Provider Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#374151]">
          <button
            onClick={() => setProvider("smtp")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              provider === "smtp"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            SMTP Propio
          </button>
          <button
            onClick={() => setProvider("resend")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              provider === "resend"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            Resend API
          </button>
        </div>

        {/* SMTP Form */}
        {provider === "smtp" && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Host SMTP
              </label>
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={config.host}
                onChange={(e) => handleConfigChange("host", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Puerto
                </label>
                <input
                  type="number"
                  placeholder="587"
                  value={config.port}
                  onChange={(e) => handleConfigChange("port", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de Remitente
                </label>
                <input
                  type="text"
                  placeholder="Mi Empresa"
                  value={config.fromName}
                  onChange={(e) => handleConfigChange("fromName", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Usuario / Email
              </label>
              <input
                type="email"
                placeholder="usuario@gmail.com"
                value={config.user}
                onChange={(e) => handleConfigChange("user", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña / App Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={config.pass}
                onChange={(e) => handleConfigChange("pass", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para Gmail: usa una contraseña de aplicación, no tu contraseña principal
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testing || !config.host || !config.user || !config.pass}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Probar Conexión"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Resend Form */}
        {provider === "resend" && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key de Resend
              </label>
              <input
                type="password"
                placeholder="re_xxxxxxxxxxxxxxxx"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1F2937] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Obtén tu API key en{" "}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  resend.com
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading || (!config.host && provider === "smtp") || (!resendKey && provider === "resend")}
          className="w-full px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Configuración"
          )}
        </button>
      </div>
    </div>
  );
}
