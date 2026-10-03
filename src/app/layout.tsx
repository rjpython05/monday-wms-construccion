import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WMS Construcción",
  description: "WMS multi-tenant embebido en monday.com Marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
