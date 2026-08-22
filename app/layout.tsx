import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ASC-Working | Project Workspace",
    template: "%s | ASC-Working",
  },
  description: "Multi-project workspace for ASC software implementation projects.",
  applicationName: "ASC-Working",
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
