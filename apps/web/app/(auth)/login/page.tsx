import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Bienvenido de nuevo</h1>
          <p className="text-gray-400 text-sm">
            Ingresá a tu cuenta de Apex IA
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link
            href="/forgot-password"
            className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{" "}
          <Link
            href="/register"
            className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            Registrate gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
