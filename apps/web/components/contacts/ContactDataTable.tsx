"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  isArchived: boolean;
  createdAt: string | null;
};

type ContactsPage = {
  items: Contact[];
  total: number;
  page: number;
  limit: number;
};

type ContactDataTableProps = {
  onSelectContact: (id: string) => void;
};

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#374151] rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function ContactDataTable({ onSelectContact }: ContactDataTableProps) {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  // Debounce: update `search` 300ms after the user stops typing
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(inputValue);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue]);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { q: search } : {}),
  });

  const { data, isLoading, isError } = useQuery<ContactsPage>({
    queryKey: ["contacts", search, page],
    queryFn: () => apiClient.get<ContactsPage>(`/contacts?${params}`),
    staleTime: 30_000,
  });

  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function handleArchive(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await apiClient.delete(`/contacts/${id}/archive`);
  }

  return (
    <div className="flex flex-col h-full bg-[#111827]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#374151]">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Buscar contacto..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-[#1F2937] border border-[#374151] rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200"
            aria-label="Buscar contactos"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">
          {total} contacto{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-[#1F2937] border-b border-[#374151]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Nombre</th>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Email</th>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Teléfono</th>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Tags</th>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Creado</th>
              <th className="px-4 py-3 font-medium text-gray-400 whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}

            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-red-400">
                  Error al cargar contactos
                </td>
              </tr>
            )}

            {!isLoading && !isError && contacts.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <Users className="w-10 h-10 text-gray-600" aria-hidden="true" />
                    <p className="text-gray-400 font-medium">No hay contactos aún</p>
                    <p className="text-gray-600 text-xs max-w-xs">
                      Importá contactos desde un CSV o agregá uno manualmente.
                    </p>
                  </div>
                </td>
              </tr>
            )}

            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onSelectContact(contact.id)}
                className="border-b border-[#374151]/50 hover:bg-[#1F2937] cursor-pointer transition-colors duration-150"
              >
                <td className="px-4 py-3 text-gray-200 font-medium whitespace-nowrap">
                  {contact.name}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {contact.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {contact.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.length === 0 && (
                      <span className="text-gray-600">—</span>
                    )}
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {formatDate(contact.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContact(contact.id);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Ver
                    </button>
                    <span className="text-gray-700">·</span>
                    <button
                      onClick={(e) => handleArchive(contact.id, e)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Archivar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#374151] bg-[#1F2937]">
          <span className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3 h-3" aria-hidden="true" />
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
