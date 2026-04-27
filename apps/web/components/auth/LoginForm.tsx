"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type LoginFormState = {
  email: string;
  password: string;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateLoginForm(data: LoginFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Email inválido";
  }
  if (!data.password) {
    errors.password = "Contraseña requerida";
  }
  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(
          data.error?.message ?? "Credenciales incorrectas. Revisá tu email y contraseña."
        );
        return;
      }

      const { organizationSlug, accessToken, refreshToken } = data.data;

      if (typeof window !== "undefined") {
        sessionStorage.setItem("apex_access_token", accessToken);
        sessionStorage.setItem("apex_refresh_token", refreshToken);
        sessionStorage.setItem("apex_org_slug", organizationSlug);
      }

      router.push(`/${organizationSlug}/inbox`);
    } catch {
      setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-300 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={`w-full bg-[#111827] border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
            errors.email ? "border-red-500" : "border-[#374151] hover:border-[#4B5563]"
          }`}
          placeholder="vos@empresa.com"
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-xs text-red-400" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-300 mb-1.5"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className={`w-full bg-[#111827] border rounded-xl px-4 py-3 pr-12 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
              errors.password
                ? "border-red-500"
                : "border-[#374151] hover:border-[#4B5563]"
            }`}
            placeholder="••••••••"
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer transition-colors duration-200 p-1"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs text-red-400" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {serverError && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400"
        >
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
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Ingresando...</span>
          </>
        ) : (
          "Iniciar sesión"
        )}
      </button>
    </form>
  );
}
