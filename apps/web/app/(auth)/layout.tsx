import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="relative py-6 px-4">
        <Link href="/" className="flex items-center gap-2 w-fit cursor-pointer">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-bold text-white">Apex IA</span>
        </Link>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="relative py-6 text-center">
        <p className="text-gray-600 text-xs">
          © 2026 Apex IA.{" "}
          <Link href="/privacy" className="hover:text-gray-400 transition-colors cursor-pointer">
            Privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-gray-400 transition-colors cursor-pointer">
            Términos
          </Link>
        </p>
      </footer>
    </div>
  );
}
