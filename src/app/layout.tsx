import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "직소퍼즐",
  description: "성인을 위한 미니멀 직소퍼즐 — 매일의 조용한 한 판",
  applicationName: "직소퍼즐",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "직소퍼즐",
  },
  icons: {
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#16120e" },
  ],
};

// Inline script that resolves the user's theme preference before the first
// paint. Avoids the dark-mode flash for returning visitors.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('jigsaw:theme');
    var pref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
