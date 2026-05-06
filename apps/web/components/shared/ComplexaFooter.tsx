"use client";

import Image from "next/image";

export function ComplexaFooter() {
  return (
    <footer className="border-t border-gray-700 bg-gray-900 px-6 py-4">
      <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
        <Image
          src="/c_sin_fondo.png"
          alt="Complexa IA"
          width={20}
          height={20}
          className="opacity-60"
        />
        <span>
          © 2026{" "}
          <a
            href="https://www.complexa.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            Complexa IA
          </a>
          {" "}®
        </span>
      </div>
    </footer>
  );
}
