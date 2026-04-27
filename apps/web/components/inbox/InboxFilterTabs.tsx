"use client";

import type { InboxFiltersType } from "@apex-ia/types";

type Tab = {
  id: InboxFiltersType["tab"];
  label: string;
};

const TABS: Tab[] = [
  { id: "all", label: "Todos" },
  { id: "unassigned", label: "Sin asignar" },
  { id: "mine", label: "Mis chats" },
  { id: "assigned", label: "Asignados" },
];

type InboxFilterTabsProps = {
  activeTab: InboxFiltersType["tab"];
  onTabChange: (tab: InboxFiltersType["tab"]) => void;
};

export function InboxFilterTabs({ activeTab, onTabChange }: InboxFilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filtros del inbox"
      className="flex gap-1 px-3 pt-2 pb-0"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === tab.id
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-gray-500 hover:text-gray-300 hover:bg-[#374151]/50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
