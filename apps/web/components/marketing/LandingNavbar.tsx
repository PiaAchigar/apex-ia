"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Precios" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "glass border-b border-[#374151]/50"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav
          className="flex items-center justify-between h-16"
          role="navigation"
          aria-label="Navegación principal"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 cursor-pointer"
            aria-label="Complexa CRM — ir al inicio"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center glow-emerald">
              <span className="text-white font-bold text-sm" aria-hidden="true">
                A
              </span>
            </div>
            <span className="text-lg font-bold text-white">Complexa CRM</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium cursor-pointer"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 glow-emerald cursor-pointer"
            >
              Empezar gratis
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg glass cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden glass rounded-2xl mx-4 mb-4 p-4 flex flex-col gap-2"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-300 hover:text-white px-4 py-3 rounded-xl hover:bg-[#374151] transition-all duration-200 text-sm cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-[#374151] my-2" />
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-300 hover:text-white px-4 py-3 rounded-xl hover:bg-[#374151] transition-all duration-200 text-sm cursor-pointer"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 cursor-pointer"
            >
              Empezar gratis
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
