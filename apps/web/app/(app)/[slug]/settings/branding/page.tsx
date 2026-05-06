"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, Upload } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

export default function BrandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { branding, isLoading, updateBranding, isUpdatingBranding } = useBranding();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#10B981");
  const [accentColor, setAccentColor] = useState("#10B981");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding) {
      setLogoPreviewUrl(branding.logoUrl || null);
      setPrimaryColor(branding.primaryColor);
      setAccentColor(branding.accentColor);
    }
  }, [branding]);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Por favor selecciona una imagen válida");
      return;
    }

    setLogoFile(file);
    setSaveError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveError("");
    setSaveSuccess(false);

    try {
      await updateBranding({
        logoUrl: logoPreviewUrl || null,
        primaryColor,
        accentColor,
      });
      setSaveSuccess(true);
      setLogoFile(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Error al guardar");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/settings`}>
          <ArrowLeft size={20} className="text-gray-400 hover:text-gray-300 cursor-pointer" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Personalizar Marca</h1>
          <p className="text-sm text-gray-400">Logo, colores y branding visual</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo Section */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Logo</h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-gray-600 bg-gray-900 px-4 py-8 text-center cursor-pointer hover:border-emerald-500 transition-colors"
            >
              {logoPreviewUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={logoPreviewUrl}
                    alt="Logo preview"
                    className="h-16 w-16 object-contain"
                  />
                  <p className="text-xs text-gray-400">{logoFile?.name || "Logo actual"}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoFile(null);
                      setLogoPreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload size={24} className="text-gray-500" />
                  <p className="text-sm text-gray-400">Haz clic para subir tu logo</p>
                  <p className="text-xs text-gray-600">(PNG, JPG, SVG · máx 2MB)</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoFileSelect}
              className="hidden"
            />
          </div>

          {/* Colors Section */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Colores</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Color Primario
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-12 rounded-lg border border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Color Acentó
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-12 rounded-lg border border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900 bg-red-900/20 p-4 text-red-400">
              <AlertCircle size={16} />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-900 bg-emerald-900/20 p-4 text-emerald-400">
              ✓ Cambios guardados exitosamente
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isUpdatingBranding}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isUpdatingBranding && <Loader2 size={16} className="animate-spin" />}
            Guardar Cambios
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 h-fit">
          <h2 className="mb-4 text-lg font-semibold text-white">Preview</h2>
          <div className="space-y-4">
            {logoPreviewUrl && (
              <div className="rounded-lg border border-gray-600 bg-gray-900 p-4">
                <p className="mb-3 text-xs text-gray-500">Tu logo:</p>
                <img
                  src={logoPreviewUrl}
                  alt="Preview"
                  className="mx-auto h-12 w-12 object-contain"
                />
              </div>
            )}

            <div className="rounded-lg border border-gray-600 bg-gray-900 p-4">
              <p className="mb-3 text-xs text-gray-500">Paleta de colores:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border border-gray-600"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-xs text-gray-400">Primario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border border-gray-600"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-xs text-gray-400">Acentó</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
