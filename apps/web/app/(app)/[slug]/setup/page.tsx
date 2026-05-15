"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Circle, Loader2, AlertCircle, Upload, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import {
  HelpDatabaseSetupModal,
  HelpDatabaseButton,
} from "@/components/setup/HelpDatabaseSetupModal";

type Tab = 1 | 2 | 3 | 4 | 5;

interface TabStatus {
  1: "idle" | "validating" | "done" | "error";
  2: "idle" | "initializing" | "done" | "error";
  3: "idle" | "uploading" | "done";
  4: "idle" | "done";
  5: "idle";
}

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
const DEBOUNCE_MS = 500;

export default function SetupPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>(1);
  const [tabStatus, setTabStatus] = useState<TabStatus>({
    1: "idle",
    2: "idle",
    3: "idle",
    4: "idle",
    5: "idle",
  });

  const [databaseUrl, setDatabaseUrl] = useState("");
  const [supabaseProjectUrl, setSupabaseProjectUrl] = useState("");
  const [dbError, setDbError] = useState<string | null>(null);

  const [tablesCreated, setTablesCreated] = useState<string[]>([]);
  const [channelsConnected, setChannelsConnected] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Branding state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#10B981");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${user?.accessToken ?? ""}`,
  });

  const validateDb = useCallback(
    async (url: string) => {
      if (!url) return;

      // Verificar que el token exista antes de hacer la solicitud
      if (!user?.accessToken) {
        setTabStatus((s) => ({ ...s, 1: "error" }));
        setDbError("Sesión expirada. Recargá la página e intentá de nuevo.");
        return;
      }

      setTabStatus((s) => ({ ...s, 1: "validating" }));
      setDbError(null);

      try {
        const res = await fetch(`${API_URL}/setup/validate-database`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            databaseUrl: url,
            supabaseProjectUrl: supabaseProjectUrl || undefined,
          }),
        });
        const data = await res.json();

        if (data.success) {
          setTabStatus((s) => ({ ...s, 1: "done" }));
        } else {
          setTabStatus((s) => ({ ...s, 1: "error" }));
          const message = data.error?.message ?? "Error desconocido";
          // Mejorar mensajes genéricos del backend
          const friendlyMessage = message === "Token requerido" || message === "Token Required"
            ? "Sesión expirada. Recargá la página e intentá de nuevo."
            : message;
          setDbError(friendlyMessage);
        }
      } catch {
        setTabStatus((s) => ({ ...s, 1: "error" }));
        setDbError("No se pudo contactar el servidor");
      }
    },
    [supabaseProjectUrl, user?.accessToken]
  );

  const handleDatabaseUrlChange = (value: string) => {
    setDatabaseUrl(value);
    setTabStatus((s) => ({ ...s, 1: "idle" }));
    setDbError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => validateDb(value), DEBOUNCE_MS);
  };

  const handleInitializeSchema = async () => {
    if (!user?.accessToken) {
      setTabStatus((s) => ({ ...s, 2: "error" }));
      setDbError("Sesión expirada. Recargá la página e intentá de nuevo.");
      return;
    }

    setTabStatus((s) => ({ ...s, 2: "initializing" }));

    try {
      const res = await fetch(`${API_URL}/setup/initialize-schema`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          databaseUrl,
          supabaseProjectUrl: supabaseProjectUrl || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTablesCreated(data.data.tablesCreated ?? []);
        setTabStatus((s) => ({ ...s, 2: "done" }));
        setActiveTab(3);
      } else {
        setTabStatus((s) => ({ ...s, 2: "error" }));
      }
    } catch {
      setTabStatus((s) => ({ ...s, 2: "error" }));
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBrandingError("Por favor selecciona una imagen válida");
      return;
    }

    setLogoFile(file);
    setBrandingError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    if (!user?.accessToken) {
      setBrandingError("Sesión expirada. Recargá la página e intentá de nuevo.");
      return;
    }

    setIsSavingBranding(true);
    setBrandingError(null);

    try {
      const res = await fetch(`${API_URL}/settings/branding`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          logoUrl: logoPreviewUrl || null,
          primaryColor,
          accentColor,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTabStatus((s) => ({ ...s, 3: "done" }));
        setActiveTab(4);
      } else {
        const message = data.error?.message ?? "Error al guardar branding";
        const friendlyMessage = message === "Token requerido" || message === "Token Required"
          ? "Sesión expirada. Recargá la página e intentá de nuevo."
          : message;
        setBrandingError(friendlyMessage);
      }
    } catch (error) {
      setBrandingError("No se pudo conectar con el servidor");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleSkipBranding = () => {
    setTabStatus((s) => ({ ...s, 3: "done" }));
    setActiveTab(4);
  };

  const handleCompleteSetup = async () => {
    if (!user?.accessToken) {
      alert("Sesión expirada. Recargá la página e intentá de nuevo.");
      return;
    }

    setIsCompleting(true);
    try {
      await fetch(`${API_URL}/setup/complete`, {
        method: "POST",
        headers: headers(),
      });
      router.push(`/${user?.organizationSlug}/inbox`);
    } finally {
      setIsCompleting(false);
    }
  };

  const canGoToTab2 = tabStatus[1] === "done";
  const canGoToTab3 = tabStatus[2] === "done";
  const canGoToTab4 = tabStatus[3] === "done" || tabStatus[3] === "idle";
  const canGoToTab5 = channelsConnected >= 1;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-2xl font-bold text-white">
          Configuración inicial
        </h1>
        <p className="mb-8 text-center text-sm text-gray-400">
          Conectá tu base de datos para empezar a usar el CRM
        </p>

        {/* Tab navigation */}
        <div className="mb-6 flex rounded-xl border border-gray-700 bg-gray-800 p-1 overflow-x-auto">
          {(
            [
              { id: 1, label: "Base de Datos" },
              { id: 2, label: "Schema" },
              { id: 3, label: "Marca" },
              { id: 4, label: "Canales" },
              { id: 5, label: "Confirmación" },
            ] as const
          ).map(({ id, label }) => {
            const enabled =
              id === 1 ||
              (id === 2 && canGoToTab2) ||
              (id === 3 && canGoToTab3) ||
              (id === 4 && canGoToTab4) ||
              (id === 5 && canGoToTab5);

            return (
              <button
                key={id}
                onClick={() => enabled && setActiveTab(id)}
                disabled={!enabled}
                className={`flex-1 min-w-max rounded-lg py-2 px-2 text-sm font-medium transition-colors
                  ${activeTab === id
                    ? "bg-emerald-600 text-white"
                    : enabled
                    ? "text-gray-300 hover:text-white"
                    : "cursor-not-allowed text-gray-600"
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Connect DB */}
        {activeTab === 1 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Conectar Base de Datos
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Ingresá la URL de conexión de tu proyecto Supabase. La encontrás
              en <strong className="text-white">Settings → Database → Connection pooling</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-300">
                    Database Connection URL
                  </label>
                  <HelpDatabaseButton onClick={() => setShowHelp(true)} />
                </div>
                <input
                  type="text"
                  value={databaseUrl}
                  onChange={(e) => handleDatabaseUrlChange(e.target.value)}
                  placeholder="postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Project URL{" "}
                  <span className="text-gray-500">(opcional, para referencia)</span>
                </label>
                <input
                  type="text"
                  value={supabaseProjectUrl}
                  onChange={(e) => setSupabaseProjectUrl(e.target.value)}
                  placeholder="https://xxx.supabase.co"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Validation status */}
              <div className="flex items-center gap-2 text-sm">
                {dbError && (
                  <>
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-400">{dbError}</span>
                  </>
                )}
                {!dbError && tabStatus[1] === "validating" && (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span className="text-gray-400">Verificando conexión...</span>
                  </>
                )}
                {!dbError && tabStatus[1] === "done" && (
                  <>
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-emerald-400">Conexión válida ✅</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                disabled={!canGoToTab2}
                onClick={() => setActiveTab(2)}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-700"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Initialize Schema */}
        {activeTab === 2 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Inicializar Schema
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Se crearán todas las tablas necesarias en tu base de datos (~10s).
            </p>

            {tabStatus[2] === "idle" && (
              <button
                onClick={handleInitializeSchema}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Inicializar Base de Datos
              </button>
            )}

            {tabStatus[2] === "initializing" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={32} className="animate-spin text-emerald-400" />
                <p className="text-sm text-gray-400">Creando tablas...</p>
              </div>
            )}

            {tabStatus[2] === "done" && (
              <div>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  {tablesCreated.map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm text-emerald-400">
                      <CheckCircle size={14} />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setActiveTab(3)}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {tabStatus[2] === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle size={16} />
                Error al inicializar. Intentá de nuevo.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Branding */}
        {activeTab === 3 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Personaliza tu Marca
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Agregá tu logo y colores. Podés cambiar esto después desde settings.
            </p>

            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Logo
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 px-4 py-8 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  {logoPreviewUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        className="h-16 w-16 object-contain"
                      />
                      <p className="text-xs text-gray-400">{logoFile?.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLogoFile(null);
                          setLogoPreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-gray-500" />
                      <p className="text-sm text-gray-400">
                        Haz clic para subir tu logo
                      </p>
                      <p className="text-xs text-gray-600">
                        (PNG, JPG, SVG · máx 2MB)
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileSelect}
                  className="hidden"
                />
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Color Primario
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-12 rounded-lg border border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Color Acentó
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-12 rounded-lg border border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {logoPreviewUrl && (
                <div className="rounded-lg border border-gray-600 bg-gray-900 p-4">
                  <p className="mb-2 text-xs text-gray-500">Preview:</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={logoPreviewUrl}
                      alt="Preview"
                      className="h-8 w-8 object-contain"
                    />
                    <div className="h-6 w-1 rounded" style={{ backgroundColor: primaryColor }} />
                    <p className="text-sm text-gray-300">Tu marca con los colores elegidos</p>
                  </div>
                </div>
              )}

              {brandingError && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle size={16} />
                  {brandingError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={handleSkipBranding}
                className="rounded-lg border border-gray-600 px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Omitir por ahora
              </button>
              <button
                onClick={handleSaveBranding}
                disabled={isSavingBranding}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-emerald-700 flex items-center gap-2"
              >
                {isSavingBranding && <Loader2 size={14} className="animate-spin" />}
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Connect Channels */}
        {activeTab === 4 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Conectar Canales
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Conectá al menos 1 canal para empezar a recibir mensajes.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                "WhatsApp",
                "Instagram",
                "Telegram",
                "Email",
                "WebChat",
                "Facebook",
              ].map((channel) => (
                <button
                  key={channel}
                  onClick={() => setChannelsConnected((n) => n + 1)}
                  className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-gray-300 hover:border-emerald-500 hover:text-white transition-colors text-left"
                >
                  {channel}
                  <span className="ml-1 text-xs text-gray-500">(configurar →)</span>
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Conectados: {channelsConnected}/1 requeridos
            </p>

            <div className="mt-6 flex justify-end">
              <button
                disabled={!canGoToTab5}
                onClick={() => setActiveTab(5)}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-700"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Confirmation */}
        {activeTab === 5 && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">
              ¡Todo listo para empezar! 🎉
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="text-emerald-400" />
                <span className="text-gray-300">
                  Base de datos conectada
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="text-emerald-400" />
                <span className="text-gray-300">
                  Schema inicializado ({tablesCreated.length} tablas)
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="text-emerald-400" />
                <span className="text-gray-300">
                  Marca personalizada
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="text-emerald-400" />
                <span className="text-gray-300">
                  {channelsConnected} canal(es) conectado(s)
                </span>
              </div>
            </div>

            <button
              onClick={handleCompleteSetup}
              disabled={isCompleting}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isCompleting && <Loader2 size={16} className="animate-spin" />}
              Ir al Inbox →
            </button>
          </div>
        )}
      </div>

      {showHelp && (
        <HelpDatabaseSetupModal onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}
