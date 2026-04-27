"use client";

import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useEffect } from "react";
import { Bell, Search, Menu } from "lucide-react";

type AppTopbarProps = {
  slug: string;
};

export function AppTopbar({ slug: _slug }: AppTopbarProps) {
  const { user } = useAuthStore();
  const { toasts, removeToast } = useUiStore();

  // auto-dismiss toasts after 4s
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    if (!latest) return;
    const timer = setTimeout(() => removeToast(latest.id), 4000);
    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  const initials = user?.userId?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <>
      <header className="h-14 flex-shrink-0 bg-[#1F2937] border-b border-[#374151] flex items-center gap-3 px-4">
        {/* Global search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar..."
              aria-label="Búsqueda global"
              className="w-full bg-[#111827] border border-[#374151] rounded-xl pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications */}
          <button
            aria-label="Notificaciones"
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[#374151]/60 transition-colors duration-150 cursor-pointer"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Avatar */}
          <div
            role="img"
            aria-label={`Usuario: ${user?.userId ?? "desconocido"}`}
            className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0"
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-5 right-5 flex flex-col gap-2 z-50"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg max-w-sm transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-red-500/20 border-red-500/40 text-red-300"
                  : toast.type === "warning"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-[#1F2937] border-[#374151] text-gray-200"
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Cerrar notificación"
                className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
