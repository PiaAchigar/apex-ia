"use client";

import { useState } from "react";
import { ContactDataTable } from "@/components/contacts/ContactDataTable";
import { ContactDetailSidebar } from "@/components/contacts/ContactDetailSidebar";
import { ContactImportCsvModal } from "@/components/contacts/ContactImportCsvModal";
import { Upload } from "lucide-react";

export default function ContactsPage() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  return (
    <div className="flex h-full bg-[#111827]">
      {/* Main table area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151] flex-shrink-0">
          <h1 className="text-xl font-semibold text-white">Contactos</h1>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Importar CSV
          </button>
        </div>

        <ContactDataTable onSelectContact={setSelectedContactId} />
      </div>

      {/* Detail sidebar */}
      <ContactDetailSidebar contactId={selectedContactId} />

      {/* Import modal */}
      {showImportModal && (
        <ContactImportCsvModal
          onClose={() => setShowImportModal(false)}
          onSuccess={(count) => {
            setShowImportModal(false);
            console.info(`Importados ${count} contactos`);
          }}
        />
      )}
    </div>
  );
}
