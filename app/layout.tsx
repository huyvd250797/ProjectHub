import type { Metadata } from "next";
import "./globals.css";

const themeBootstrap = `
(function () {
  try {
    var key = "asc-working-theme";
    var stored = localStorage.getItem(key);
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: {
    default: "ASC WORKING | Project Workspace",
    template: "%s | ASC WORKING",
  },
  description: "ASC WORKING — multi-project workspace for software implementation projects.",
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
