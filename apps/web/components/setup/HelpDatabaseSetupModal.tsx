"use client";

import { useState } from "react";
import { X, ExternalLink, HelpCircle } from "lucide-react";

interface HelpDatabaseSetupModalProps {
  onClose: () => void;
}

export function HelpDatabaseSetupModal({ onClose }: HelpDatabaseSetupModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-gray-800 border border-gray-700 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-white">
          ¿Cómo obtener tu Database Connection URL?
        </h2>

        <ol className="space-y-3 text-sm text-gray-300">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              1
            </span>
            <span>
              Andá a{" "}
              <a
                href="https://app.supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline"
              >
                app.supabase.com
              </a>{" "}
              e iniciá sesión.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              2
            </span>
            <span>Creá un nuevo proyecto (el plan FREE está bien).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              3
            </span>
            <span>
              Andá a <strong className="text-white"> la parte superior → Connect → Connect to your project → Direct</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              4
            </span>
            <span>
              Hace scroll hasta, copiá la{" "}
              <strong className="text-white">Connection string</strong>.
              <br />
              <code className="mt-1 block rounded bg-gray-900 px-2 py-1 text-xs text-emerald-300">
                postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
              </code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              5
            </span>
            <span>Pegala en el campo de abajo y verificá la conexión.</span>
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          <strong>⚠️ Importante:</strong> Esta URL Apex IA la guarda encriptada con AES-256-GCM y nunca la expone.
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <a
            href="https://supabase.com/docs/guides/getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            Documentación oficial <ExternalLink size={14} />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export function HelpDatabaseButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-400 hover:text-white transition-colors"
      title="¿Cómo obtener las credenciales?"
    >
      <HelpCircle size={18} />
    </button>
  );
}
