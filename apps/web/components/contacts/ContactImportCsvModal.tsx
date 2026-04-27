"use client";

import { useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type ImportState = "idle" | "preview" | "importing" | "success" | "error";

type ContactImportCsvModalProps = {
  onClose: () => void;
  onSuccess: (count: number) => void;
};

const EXPECTED_HEADERS = ["name", "email", "phone"];
const PREVIEW_ROWS = 5;

export function ContactImportCsvModal({ onClose, onSuccess }: ContactImportCsvModalProps) {
  const [state, setState] = useState<ImportState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [csvContent, setCsvContent] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): string[][] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.split(",").map((cell) => cell.trim()));
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setErrorMessage("Solo se aceptan archivos .csv");
      setState("error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrorMessage("El archivo CSV está vacío o no tiene datos.");
        setState("error");
        return;
      }

      const headers = rows[0]?.map((h) => h.toLowerCase()) ?? [];
      const missingHeaders = EXPECTED_HEADERS.filter((h) => !headers.includes(h));

      if (missingHeaders.length > 0) {
        setErrorMessage(
          `Faltan columnas requeridas: ${missingHeaders.join(", ")}. El CSV debe tener: name, email, phone`
        );
        setState("error");
        return;
      }

      setCsvContent(text);
      setParsedRows(rows);
      setState("preview");
    };
    reader.readAsText(file);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  async function handleImport() {
    setState("importing");
    try {
      const result = await apiClient.post<{ imported: number }>("/contacts/import-csv", {
        csvContent,
      });
      setState("success");
      onSuccess(result.imported);
    } catch {
      setErrorMessage("Error al importar los contactos. Revisá el formato del archivo.");
      setState("error");
    }
  }

  const headers = parsedRows[0] ?? [];
  const dataRows = parsedRows.slice(1);
  const contactCount = dataRows.length;
  const previewData = dataRows.slice(0, PREVIEW_ROWS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Importar contactos desde CSV"
    >
      <div className="relative w-full max-w-2xl mx-4 bg-[#1F2937] border border-[#374151] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#374151]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-white font-semibold text-base">Importar contactos desde CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Idle: drop zone */}
          {(state === "idle" || state === "error") && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-500/5"
                    : "border-[#374151] hover:border-emerald-500/50 hover:bg-[#374151]/30"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                aria-label="Área de carga de archivo CSV"
              >
                <Upload className="w-8 h-8 text-gray-500" aria-hidden="true" />
                <div className="text-center">
                  <p className="text-gray-300 font-medium text-sm">
                    Arrastrá tu archivo CSV acá
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    o hacé click para seleccionar
                  </p>
                </div>
                <p className="text-xs text-gray-600 text-center">
                  Columnas requeridas: <span className="font-mono text-gray-500">name, email, phone</span>
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
                aria-hidden="true"
              />

              {state === "error" && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}
            </>
          )}

          {/* Preview */}
          {state === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300">
                  Se importarán{" "}
                  <span className="font-semibold text-emerald-400">{contactCount}</span>{" "}
                  contacto{contactCount !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => {
                    setState("idle");
                    setCsvContent("");
                    setParsedRows([]);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cambiar archivo
                </button>
              </div>

              <div className="overflow-auto rounded-xl border border-[#374151]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#111827] border-b border-[#374151]">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-medium text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-[#374151]/50 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-gray-300 truncate max-w-[180px]">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {contactCount > PREVIEW_ROWS && (
                <p className="text-xs text-gray-600 text-center">
                  Mostrando {PREVIEW_ROWS} de {contactCount} filas
                </p>
              )}
            </>
          )}

          {/* Importing */}
          {state === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden="true" />
              <p className="text-gray-300 text-sm">Importando {contactCount} contactos...</p>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle className="w-10 h-10 text-emerald-400" aria-hidden="true" />
              <p className="text-white font-semibold">¡Importación exitosa!</p>
              <p className="text-gray-400 text-sm">
                Se importaron {contactCount} contactos correctamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#374151]">
          {state === "success" ? (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-[#374151] text-gray-300 hover:bg-[#4B5563] transition-colors"
              >
                Cancelar
              </button>
              {state === "preview" && (
                <button
                  onClick={handleImport}
                  className="px-5 py-2 text-sm rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
                >
                  Importar {contactCount} contacto{contactCount !== 1 ? "s" : ""}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
