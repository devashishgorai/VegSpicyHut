import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veg Spicy Hut Admin",
  description: "Tabio admin recreated on Next.js",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/favicon.png?v=2", type: "image/png" },
      { url: "/icon.png?v=2", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: "/apple-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
