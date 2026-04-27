"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setEmailError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Email inválido");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) {
        setServerError("No pudimos enviar el email. Verificá que sea correcto.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setServerError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold mb-2">Email enviado</h2>
        <p className="text-gray-400 text-sm">
          Revisá tu bandeja de entrada en <strong className="text-gray-200">{email}</strong>.
          El link expira en 1 hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full bg-[#111827] border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
            emailError ? "border-red-500" : "border-[#374151] hover:border-[#4B5563]"
          }`}
          placeholder="vos@empresa.com"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError && (
          <p id="email-error" className="mt-1.5 text-xs text-red-400" role="alert">
            {emailError}
          </p>
        )}
      </div>

      {serverError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 glow-emerald cursor-pointer flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          "Enviar link de recuperación"
        )}
      </button>
    </form>
  );
}
