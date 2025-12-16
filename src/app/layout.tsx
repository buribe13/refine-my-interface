import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Booth - Classic Mac OS 9",
  description: "A retro Photo Booth experience inspired by Classic Mac OS 9, with gesture controls",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
