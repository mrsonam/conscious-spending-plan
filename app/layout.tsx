import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegistration } from "./components/PwaRegistration";
import { PwaThemeSync } from "./components/PwaThemeSync";
import { SplashScreenLoader } from "./components/SplashScreenLoader";
import { pwaThemeColorForShell } from "@/lib/pwa-branding";
import { DASHBOARD_THEME_COOKIE_BOOTSTRAP } from "@/lib/dashboard-theme-cookie";
import { DashboardThemeCookieSync } from "./components/DashboardThemeCookieSync";
import { StaticPwaSplash } from "@/components/pwa/static-pwa-splash";
import { APPLE_TOUCH_STARTUP_LINKS } from "@/lib/pwa-apple-startup";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conscious Spending Plan",
  description: "Manage your finances with Ramit Sethi's Conscious Spending Plan",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "CSP",
  },
};

/** No `themeColor` here — Next would inject a second `<meta name="theme-color">` that fights our themed tag. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-csp-dashboard-theme="console"
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" sizes="192x192" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          id="csp-apple-status-bar"
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="CSP" />
        <meta
          id="csp-theme-color"
          name="theme-color"
          content={pwaThemeColorForShell()}
        />
        {APPLE_TOUCH_STARTUP_LINKS.map((link) => (
          <link
            key={link.media ?? "default"}
            rel="apple-touch-startup-image"
            href={link.href}
            {...(link.media ? { media: link.media } : {})}
          />
        ))}
        <script
          dangerouslySetInnerHTML={{ __html: DASHBOARD_THEME_COOKIE_BOOTSTRAP }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StaticPwaSplash />
        <SplashScreenLoader />
        <PwaRegistration />
        <Providers session={session}>
          <DashboardThemeCookieSync />
          <PwaThemeSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
