"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Upload, X, Loader2 } from "lucide-react";

type AutomationUploadModalProps = {
  open: boolean;
  onClose: () => void;
};

type AutomationType = "python" | "json";

export function AutomationUploadModal({ open, onClose }: AutomationUploadModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AutomationType>("python");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("type", type);
      formData.append("file", new File([fileContent], `automation.${type === "python" ? "py" : "json"}`));

      return apiClient.post("/settings/automations/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      resetForm();
      onClose();
    },
  });

  const resetForm = () => {
    setName("");
    setType("python");
    setFileContent("");
    setFileName(null);
    setPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = async (file: File) => {
    const validExt = type === "python" ? ".py" : ".json";
    if (!file.name.toLowerCase().endsWith(validExt)) {
      alert(`File must have ${validExt} extension`);
      return;
    }

    if (file.size > 500 * 1024) {
      alert("File size must be <= 500KB");
      return;
    }

    const content = await file.text();
    setFileContent(content);
    setFileName(file.name);
    setPreview(content.substring(0, 500));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!open) return null;

  const isReady = name.trim() && fileContent.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-[#1F2937] border border-[#374151] shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-100">Nueva Automatización</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi automatización"
              className="w-full px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setType("python");
                  setFileContent("");
                  setFileName(null);
                  setPreview("");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  type === "python"
                    ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                    : "bg-[#111827] border border-[#374151] text-gray-400 hover:text-gray-300"
                }`}
              >
                Python Script
              </button>
              <button
                onClick={() => {
                  setType("json");
                  setFileContent("");
                  setFileName(null);
                  setPreview("");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  type === "json"
                    ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                    : "bg-[#111827] border border-[#374151] text-gray-400 hover:text-gray-300"
                }`}
              >
                JSON Workflow
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Archivo</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative rounded-lg border-2 border-dashed border-[#374151] bg-[#111827] p-6 text-center hover:border-emerald-500/50 transition-all cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={type === "python" ? ".py" : ".json"}
                onChange={handleInputChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-gray-400" />
                {fileName ? (
                  <div className="text-sm text-emerald-400">{fileName}</div>
                ) : (
                  <>
                    <div className="text-xs text-gray-400">Arrastra tu archivo aquí</div>
                    <div className="text-xs text-gray-500">o haz clic para seleccionar</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Preview</label>
              <pre className="text-xs overflow-auto max-h-40 bg-[#111827] border border-[#374151] rounded-lg p-3 text-gray-300 whitespace-pre-wrap break-words">
                {preview}
                {fileContent.length > 500 && "..."}
              </pre>
            </div>
          )}

          {/* Error message if exists */}
          {uploadMutation.isError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {uploadMutation.error instanceof Error
                ? uploadMutation.error.message
                : "Error uploading automation"}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={uploadMutation.isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-[#111827] border border-[#374151] text-gray-300 hover:bg-[#0F172A] transition-all text-xs font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={!isReady || uploadMutation.isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Subir"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
