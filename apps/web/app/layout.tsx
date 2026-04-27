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
    default: "Apex IA — CRM Omnicanal para PyMEs",
    template: "%s | Apex IA",
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
  authors: [{ name: "Apex IA" }],
  creator: "Apex IA",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://apexia.com"
  ),
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "Apex IA",
    title: "Apex IA — CRM Omnicanal con IA para PyMEs",
    description:
      "Centralizá todos tus canales de mensajería. Automatizá con IA. Cierra más ventas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apex IA",
    description: "CRM Omnicanal con IA para PyMEs latinoamericanas",
  },
  robots: {
    index: true,
    follow: true,
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
