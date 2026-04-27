import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Recuperar contraseña</h1>
          <p className="text-gray-400 text-sm">
            Ingresá tu email y te enviamos un link para resetear tu contraseña.
          </p>
        </div>

        <ForgotPasswordForm />

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            ← Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
