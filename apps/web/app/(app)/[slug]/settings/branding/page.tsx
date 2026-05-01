"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";
import { useBillingStatus } from "@/hooks/useBillingStatus";

export default function BrandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { branding, isLoading, updateBranding, updateDomain, isUpdatingBranding, isUpdatingDomain } = useBranding();
  const { plan } = useBillingStatus();

  // Form state
  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#10B981");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [customDomain, setCustomDomain] = useState("");
  const [whitelabelEnabled, setWhitelabelEnabled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showDomainPreview, setShowDomainPreview] = useState(false);

  // Initialize form with branding data
  useEffect(() => {
    if (branding) {
      setAppName(branding.appName);
      setLogoUrl(branding.logoUrl || "");
      setPrimaryColor(branding.primaryColor);
      setAccentColor(branding.accentColor);
      setCustomDomain(branding.customDomain || "");
      setWhitelabelEnabled(branding.whitelabelEnabled);
    }
  }, [branding]);

  const isBusiness = plan === "business";

  const handleSaveBranding = async () => {
    setSaveError("");
    setSaveSuccess(false);

    try {
      await updateBranding({
        appName: appName.trim() || "Apex IA",
        logoUrl: logoUrl.trim() || null,
        primaryColor,
        accentColor,
        whitelabelEnabled: isBusiness ? whitelabelEnabled : false,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const error = err as any;
      setSaveError(error.message || "Error al guardar branding");
    }
  };

  const handleSaveDomain = async () => {
    setSaveError("");
    setSaveSuccess(false);

    try {
      await updateDomain(customDomain.trim() || null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const error = err as any;
      setSaveError(error.message || "Error al guardar dominio");
    }
  };

  if (!isBusiness) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
        <div className="p-6 max-w-4xl mx-auto">
          <Link
            href={`/${slug}/settings`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Link>

          <div className="bg-amber-500/15 border border-amber-500/25 rounded-lg p-6 mt-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold">Plan Business requerido</h3>
                <p className="text-gray-400 text-sm mt-1">
                  La personalización de marca está disponible solo en el plan Business. Actualiza tu plan para acceder a esta funcionalidad.
                </p>
                <button
                  onClick={() => (window.location.href = `/${slug}/settings/billing`)}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Actualizar plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#111827]">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${slug}/settings`}
            className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Configuración
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Marca</h1>
          <p className="text-gray-400">Personaliza cómo se ve tu instancia de Apex IA</p>
        </div>

        {/* Success/Error messages */}
        {saveSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/15 border border-emerald-500/25 rounded-lg text-emerald-400 text-sm">
            ✓ Cambios guardados exitosamente
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-4 bg-red-500/15 border border-red-500/25 rounded-lg text-red-400 text-sm flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {saveError}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Branding Section */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Configuración de marca</h2>

              {/* App Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la aplicación</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Apex IA"
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">Se mostrará en la barra lateral</p>
              </div>

              {/* Logo URL */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">URL del logo</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">Imagen cuadrada, idealmente 256x256px o mayor</p>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color primario</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-[#374151]"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-[#111827] border border-[#374151] rounded-lg px-3 py-1 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color acentuado</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-[#374151]"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 bg-[#111827] border border-[#374151] rounded-lg px-3 py-1 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Whitelabel Toggle */}
              <div className="mb-6 pb-6 border-b border-[#374151]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Ocultar "Powered by Apex IA"</label>
                    <p className="text-xs text-gray-500 mt-1">Tu marca se mostrará como si fuera tu propia aplicación</p>
                  </div>
                  <button
                    onClick={() => setWhitelabelEnabled(!whitelabelEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      whitelabelEnabled ? "bg-emerald-500" : "bg-[#374151]"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        whitelabelEnabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveBranding}
                disabled={isUpdatingBranding}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isUpdatingBranding && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>

            {/* Domain Section */}
            <div className="bg-[#1F2937] border border-[#374151] rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Dominio personalizado</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Dominio</label>
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="app.ejemplo.com"
                  className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">Dejar vacío para usar el dominio predeterminado</p>
              </div>

              {customDomain && (
                <div className="mb-6 p-4 bg-blue-500/15 border border-blue-500/25 rounded-lg">
                  <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => setShowDomainPreview(!showDomainPreview)}>
                    {showDomainPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span className="text-sm font-medium text-blue-400">
                      {showDomainPreview ? "Ocultar" : "Mostrar"} instrucciones DNS
                    </span>
                  </div>
                  {showDomainPreview && (
                    <div className="text-xs text-gray-400 space-y-2">
                      <p>Para usar este dominio, configura los siguientes records en tu proveedor DNS:</p>
                      <code className="block bg-[#111827] p-2 rounded text-gray-300 mt-2">
                        CNAME {customDomain} → apex-ia.vercel.app
                      </code>
                      <p className="mt-2">Los cambios pueden tomar hasta 48 horas en propagarse.</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSaveDomain}
                disabled={isUpdatingDomain}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isUpdatingDomain && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar dominio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
