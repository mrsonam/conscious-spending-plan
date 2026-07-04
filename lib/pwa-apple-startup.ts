/**
 * iOS standalone launch images. SVG is not supported, use PNG (icon-512 scales).
 * @see https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
 */
export const PWA_APPLE_STARTUP_IMAGE = "/icon-512.png"

/** Common portrait sizes; same asset avoids a blank native splash while JS loads. */
export const APPLE_TOUCH_STARTUP_LINKS: { media?: string; href: string }[] = [
  { href: PWA_APPLE_STARTUP_IMAGE },
  {
    media:
      "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    href: PWA_APPLE_STARTUP_IMAGE,
  },
  {
    media:
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    href: PWA_APPLE_STARTUP_IMAGE,
  },
  {
    media:
      "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    href: PWA_APPLE_STARTUP_IMAGE,
  },
  {
    media:
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    href: PWA_APPLE_STARTUP_IMAGE,
  },
  {
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    href: PWA_APPLE_STARTUP_IMAGE,
  },
]
