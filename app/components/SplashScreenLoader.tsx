"use client"

import dynamic from "next/dynamic"

const SplashScreen = dynamic(
  () =>
    import("./SplashScreen").then((m) => ({ default: m.SplashScreen })),
  { ssr: false },
)

export function SplashScreenLoader() {
  return <SplashScreen />
}
