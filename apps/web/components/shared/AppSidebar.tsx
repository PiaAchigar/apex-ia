"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useInboxStore } from "@/stores/inboxStore";
import {
  Inbox,
  Kanban,
  Users,
  CheckSquare,
  Calendar,
  Megaphone,
  BarChart2,
  Zap,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  FileText,
  Phone,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Inbox", href: "inbox", icon: Inbox },
  { label: "Pipeline", href: "pipeline", icon: Kanban, adminOnly: true },
  { label: "Contactos", href: "contacts", icon: Users },
  { label: "Tareas", href: "tasks", icon: CheckSquare },
  { label: "Calendario", href: "calendar", icon: Calendar },
  { label: "Campañas", href: "campaigns", icon: Megaphone, adminOnly: true },
  { label: "Llamadas", href: "call-logs", icon: Phone },
  { label: "Flow Builder", href: "flow-builder", icon: Zap, adminOnly: true },
  { label: "Analytics", href: "analytics", icon: BarChart2, adminOnly: true },
  { label: "Reports", href: "reports", icon: FileText, adminOnly: true },
];

type AppSidebarProps = {
  slug: string;
};

export function AppSidebar({ slug }: AppSidebarProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();
  const { user, clearAuth } = useAuthStore();
  const { unreadCount } = useInboxStore();

  const isAdmin = user?.roleName === "admin";

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const isActive = (href: string) =>
    pathname.startsWith(`/${slug}/${href}`);

  return (
    <aside
      aria-label="Navegación principal"
      className={`flex flex-col h-full bg-[#1F2937] border-r border-[#374151] transition-all duration-300 flex-shrink-0 ${
        isSidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-4 py-4 border-b border-[#374151] flex-shrink-0 ${
          isSidebarCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        {!isSidebarCollapsed && (
          <span className="text-sm font-bold text-white tracking-wide">Apex IA</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul role="list" className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badge = item.href === "inbox" ? unreadCount : (item.badge ?? 0);

            return (
              <li key={item.href}>
                <Link
                  href={`/${slug}/${item.href}`}
                  aria-label={isSidebarCollapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                    active
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#374151]/60 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${active ? "text-emerald-400" : "text-gray-500 group-hover:text-gray-300"}`}
                    aria-hidden="true"
                  />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} sin leer`}
                      className={`flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center ${
                        isSidebarCollapsed ? "absolute top-1 right-1" : ""
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 border-t border-[#374151] px-2 py-3 flex flex-col gap-0.5">
        <Link
          href={`/${slug}/settings`}
          aria-label={isSidebarCollapsed ? "Configuración" : undefined}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-[#374151]/60 transition-all duration-150 group border border-transparent"
        >
          <Settings
            className="w-4 h-4 flex-shrink-0 text-gray-500 group-hover:text-gray-300"
            aria-hidden="true"
          />
          {!isSidebarCollapsed && <span className="truncate">Configuración</span>}
        </Link>

        <button
          onClick={clearAuth}
          aria-label="Cerrar sesión"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 group border border-transparent w-full cursor-pointer"
        >
          <LogOut
            className="w-4 h-4 flex-shrink-0 text-gray-500 group-hover:text-red-400"
            aria-hidden="true"
          />
          {!isSidebarCollapsed && <span className="truncate">Salir</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        aria-label={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
        className="absolute bottom-20 -right-3 w-6 h-6 bg-[#374151] border border-[#4B5563] rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#4B5563] transition-all duration-150 cursor-pointer z-10"
        style={{ position: "absolute" }}
      >
        {isSidebarCollapsed ? (
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
        ) : (
          <ChevronLeft className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
