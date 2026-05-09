"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

type RegisterFormState = {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationSlug: string;
};

type FieldErrors = Partial<Record<keyof RegisterFormState, string>>;

function validateRegisterForm(data: RegisterFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.fullName || data.fullName.length < 2) {
    errors.fullName = "Nombre mínimo 2 caracteres";
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Email inválido";
  }

  if (!data.password || data.password.length < 8) {
    errors.password = "Contraseña mínimo 8 caracteres";
  }

  if (!data.organizationName || data.organizationName.length < 2) {
    errors.organizationName = "Nombre de empresa mínimo 2 caracteres";
  }

  if (
    !data.organizationSlug ||
    !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(data.organizationSlug) ||
    data.organizationSlug.length < 3
  ) {
    errors.organizationSlug =
      "Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.";
  }

  return errors;
}

function autoSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormState>({
    email: "",
    password: "",
    fullName: "",
    organizationName: "",
    organizationSlug: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const handleOrgNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      organizationName: value,
      organizationSlug: slugEdited ? prev.organizationSlug : autoSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateRegisterForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setIsLoading(true);
    try {
      const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(
          data.error?.message?.includes("SLUG_TAKEN")
            ? "Ese slug de empresa ya está en uso. Probá con otro."
            : data.error?.message ?? "Error al crear la cuenta. Intentá de nuevo."
        );
        return;
      }

      const { organizationSlug } = data.data;
      router.push(`/${organizationSlug}/inbox`);
    } catch {
      setServerError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: keyof RegisterFormState) =>
    `w-full bg-[#111827] border rounded-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
      errors[field]
        ? "border-red-500"
        : "border-[#374151] hover:border-[#4B5563]"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1.5">
          Tu nombre
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          className={inputClass("fullName")}
          placeholder="María García"
          aria-invalid={!!errors.fullName}
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-red-400" role="alert">{errors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={inputClass("email")}
          placeholder="maria@empresa.com"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-400" role="alert">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`${inputClass("password")} pr-12`}
            placeholder="Mínimo 8 caracteres"
            aria-invalid={!!errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer transition-colors p-1"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-400" role="alert">{errors.password}</p>
        )}
      </div>

      <div className="border-t border-[#374151] pt-4">
        <p className="text-xs text-gray-500 mb-4">Datos de tu empresa</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-300 mb-1.5">
              Nombre de la empresa
            </label>
            <input
              id="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              className={inputClass("organizationName")}
              placeholder="Acme Corp"
              aria-invalid={!!errors.organizationName}
            />
            {errors.organizationName && (
              <p className="mt-1 text-xs text-red-400" role="alert">{errors.organizationName}</p>
            )}
          </div>

          <div>
            <label htmlFor="organizationSlug" className="block text-sm font-medium text-gray-300 mb-1.5">
              URL de tu workspace
            </label>
            <div className="flex items-center gap-0">
              <span className="bg-[#1F2937] border border-r-0 border-[#374151] rounded-l-xl px-3 py-3 text-gray-500 text-sm whitespace-nowrap">
                crm.complexa.com.ar/
              </span>
              <input
                id="organizationSlug"
                type="text"
                value={formData.organizationSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setFormData({ ...formData, organizationSlug: e.target.value.toLowerCase() });
                }}
                className={`flex-1 bg-[#111827] border rounded-r-xl px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 ${
                  errors.organizationSlug ? "border-red-500" : "border-[#374151]"
                }`}
                placeholder="acme"
                aria-invalid={!!errors.organizationSlug}
              />
            </div>
            {errors.organizationSlug && (
              <p className="mt-1 text-xs text-red-400" role="alert">{errors.organizationSlug}</p>
            )}
            {!errors.organizationSlug && formData.organizationSlug && (
              <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> crm.complexa.com.ar/{formData.organizationSlug}
              </p>
            )}
          </div>
        </div>
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
            <span>Creando cuenta...</span>
          </>
        ) : (
          "Crear cuenta gratis"
        )}
      </button>

      <p className="text-xs text-gray-600 text-center">
        Al registrarte aceptás nuestros{" "}
        <a href="/terms" className="text-gray-500 hover:text-gray-300 cursor-pointer">
          Términos de Servicio
        </a>{" "}
        y{" "}
        <a href="/privacy" className="text-gray-500 hover:text-gray-300 cursor-pointer">
          Política de Privacidad
        </a>
        .
      </p>
    </form>
  );
}
