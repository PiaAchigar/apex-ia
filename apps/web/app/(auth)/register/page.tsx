import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Crear tu cuenta</h1>
          <p className="text-gray-400 text-sm">
            Gratis para siempre. Sin tarjeta de crédito.
          </p>
        </div>

        <RegisterForm />

        <div className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            Iniciá sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
