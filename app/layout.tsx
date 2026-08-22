import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASC ProjectHub",
  description:
    "Working View V0.5.1 cho web app quản lý triển khai dự án phần mềm giáo dục.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
