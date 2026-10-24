import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const INSTALL_CAPTURE_SCRIPT = `
(function () {
  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__ecclesiaInstallPrompt = event;
    window.dispatchEvent(new Event("ecclesia:install-available"));
  });
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Ecclesia",
  title: {
    default: "Ecclesia — Gestão de Igrejas",
    template: "%s | Ecclesia",
  },
  description:
    "Sistema profissional de gestão administrativa e financeira para igrejas: membros, congregações, dízimos, ofertas, contabilidade gerencial e relatórios.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/icons/favicon-32.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Ecclesia",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1b33",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script
          id="pwa-install-capture"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: INSTALL_CAPTURE_SCRIPT }}
        />
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}