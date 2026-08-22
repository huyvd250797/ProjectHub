import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Project Hub | Project Workspace",
    template: "%s | Project Hub",
  },
  description: "Multi-project workspace for software implementation projects.",
  icons: {
    icon: "/branding/hv-logo.jpg",
    shortcut: "/branding/hv-logo.jpg",
    apple: "/branding/hv-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
