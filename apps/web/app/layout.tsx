import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export const metadata: Metadata = {
  title: {
    default: "Complexa CRM — Omnicanal para tu Empresa.",
    template: "%s | Complexa CRM",
  },
  description:
    "Centralizá WhatsApp, Instagram, Facebook, Telegram y más en un solo inbox. Automatizá con IA. Cierra más ventas.",
  keywords: [
    "CRM",
    "WhatsApp",
    "omnicanal",
    "automatización",
    "PyMEs",
    "LATAM",
    "chatbot",
    "IA",
  ],
  authors: [{ name: "Complexa CRM" }],
  creator: "Complexa IA",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://crm.complexa.com.ar"
  ),
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "Complexa CRM",
    title: "Complexa CRM — CRM Omnicanal con IA para PyMEs",
    description:
      "Centralizá todos tus canales de mensajería. Automatizá con IA. Cierra más ventas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Complexa CRM",
    description: "CRM Omnicanal, con automatización en la personalización de mensajes.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/c_sin_fondo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${firaSans.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <body className="font-[var(--font-fira-sans)] antialiased">
        {children}
      </body>
    </html>
  );
}
