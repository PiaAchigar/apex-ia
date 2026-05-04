"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AlertCircle, CheckCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { HelpDatabaseSetupModal } from "./HelpDatabaseSetupModal";

type SetupStep = "idle" | "validating" | "validated" | "initializing" | "complete";

interface SetupRequiredModalProps {
  onSetupComplete: () => void;
}

interface ValidateResponse {
  message: string;
}

interface InitializeResponse {
  tablesCreated: string[];
}

interface CompleteResponse {
  message: string;
}

export function SetupRequiredModal({ onSetupComplete }: SetupRequiredModalProps) {
  const [step, setStep] = useState<SetupStep>("idle");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [supabaseProjectUrl, setSupabaseProjectUrl] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const validateMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ValidateResponse>("/setup/validate-database", {
        databaseUrl,
        supabaseProjectUrl: supabaseProjectUrl || undefined,
      }),
    onSuccess: () => setStep("validated"),
    onError: () => setStep("idle"),
  });

  const initSchemaMutation = useMutation({
    mutationFn: () =>
      apiClient.post<InitializeResponse>("/setup/initialize-schema", {
        databaseUrl,
        supabaseProjectUrl: supabaseProjectUrl || undefined,
      }),
    onSuccess: () => {
      setStep("initializing");
      completeMutation.mutate();
    },
    onError: () => setStep("validated"),
  });

  const completeMutation = useMutation({
    mutationFn: () => apiClient.post<CompleteResponse>("/setup/complete", {}),
    onSuccess: () => {
      setStep("complete");
      onSetupComplete();
    },
    onError: () => setStep("validated"),
  });

  const handleSubmit = () => {
    if (step === "idle" && databaseUrl.trim()) {
      setStep("validating");
      validateMutation.mutate();
    } else if (step === "validated") {
      setStep("initializing");
      initSchemaMutation.mutate();
    }
  };

  const getErrorMessage = (): string | null => {
    if (validateMutation.isError && validateMutation.error instanceof Error) {
      return validateMutation.error.message;
    }
    if (initSchemaMutation.isError && initSchemaMutation.error instanceof Error) {
      return initSchemaMutation.error.message;
    }
    if (completeMutation.isError && completeMutation.error instanceof Error) {
      return completeMutation.error.message;
    }
    return null;
  };

  const isSubmitDisabled =
    !databaseUrl.trim() ||
    validateMutation.isPending ||
    initSchemaMutation.isPending ||
    completeMutation.isPending;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-full max-w-lg rounded-xl bg-[#1F2937] border border-[#374151] p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Configurá tu base de datos</h2>
            <p className="text-gray-400 text-sm">
              Necesitás conectar tu base de datos antes de usar la app
            </p>
          </div>

          {/* Content based on step */}
          {step === "idle" || step === "validating" ? (
            <>
              {/* Database URL Field */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label htmlFor="database-url" className="text-sm font-semibold text-white">
                    URL de conexión PostgreSQL
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="text-gray-400 hover:text-gray-300 transition"
                    title="Ver guía de Supabase"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <input
                  id="database-url"
                  type="text"
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  placeholder="postgresql://user:password@host:5432/database"
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  disabled={validateMutation.isPending}
                />
              </div>

              {/* Supabase Project URL Field */}
              <div className="mb-6">
                <label htmlFor="supabase-url" className="text-sm font-semibold text-white block mb-2">
                  URL del Proyecto Supabase (opcional)
                </label>
                <input
                  id="supabase-url"
                  type="text"
                  value={supabaseProjectUrl}
                  onChange={(e) => setSupabaseProjectUrl(e.target.value)}
                  placeholder="https://xyzabc.supabase.co"
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  disabled={validateMutation.isPending}
                />
              </div>

              {/* Error Message */}
              {validateMutation.isError && getErrorMessage() && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{getErrorMessage()}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition flex items-center justify-center gap-2"
              >
                {validateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Verificar conexión
              </button>
            </>
          ) : step === "validated" ? (
            <>
              {/* Success indicator */}
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-400">Conexión válida ✅</p>
              </div>

              {/* Database URL Field (disabled) */}
              <div className="mb-4">
                <label htmlFor="database-url" className="text-sm font-semibold text-white block mb-2">
                  URL de conexión PostgreSQL
                </label>
                <input
                  id="database-url"
                  type="text"
                  value={databaseUrl}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Supabase Project URL Field (disabled) */}
              <div className="mb-6">
                <label htmlFor="supabase-url" className="text-sm font-semibold text-white block mb-2">
                  URL del Proyecto Supabase
                </label>
                <input
                  id="supabase-url"
                  type="text"
                  value={supabaseProjectUrl || "—"}
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Error Message */}
              {initSchemaMutation.isError && getErrorMessage() && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{getErrorMessage()}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={initSchemaMutation.isPending}
                className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold transition flex items-center justify-center gap-2"
              >
                {initSchemaMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Inicializar Schema
              </button>
            </>
          ) : step === "initializing" ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-white font-semibold">Inicializando schema...</p>
              <p className="text-gray-400 text-sm mt-2">Esto puede tomar unos segundos</p>
            </div>
          ) : step === "complete" ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-4" />
              <p className="text-white font-semibold">¡Todo listo!</p>
              <p className="text-gray-400 text-sm mt-2">Tu base de datos está configurada</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && <HelpDatabaseSetupModal onClose={() => setShowHelp(false)} />}
    </>
  );
}
