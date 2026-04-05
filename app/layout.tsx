import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { PwaRegistration } from "./components/PwaRegistration";
import { PwaThemeSync } from "./components/PwaThemeSync";
import { SplashScreen } from "./components/SplashScreen";
import { pwaThemeColorForShell } from "@/lib/pwa-branding";
import {
  DASHBOARD_THEME_COOKIE,
  DASHBOARD_THEME_COOKIE_BOOTSTRAP,
  parseDashboardTheme,
} from "@/lib/dashboard-theme-cookie";
import { DashboardThemeCookieSync } from "./components/DashboardThemeCookieSync";

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
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Finance",
  },
};

/** No `themeColor` here — Next would inject a second `<meta name="theme-color">` that fights our themed tag. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const splashTheme = parseDashboardTheme(
    jar.get(DASHBOARD_THEME_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-csp-dashboard-theme={splashTheme}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          id="csp-apple-status-bar"
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Finance" />
        <meta
          id="csp-theme-color"
          name="theme-color"
          content={pwaThemeColorForShell(splashTheme)}
        />
        {/* Splash screens for different device sizes */}
        <link rel="apple-touch-startup-image" href="/icon.svg" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icon.svg" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icon.svg" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icon.svg" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icon.svg" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <script
          dangerouslySetInnerHTML={{ __html: DASHBOARD_THEME_COOKIE_BOOTSTRAP }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SplashScreen initialTheme={splashTheme} />
        <PwaRegistration />
        <Providers>
          <DashboardThemeCookieSync />
          <PwaThemeSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
