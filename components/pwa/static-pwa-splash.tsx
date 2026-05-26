import Image from "next/image"

/**
 * Instant PWA splash in the initial HTML (no React). Hidden once the client
 * SplashScreen mounts so the animated handoff can take over.
 */
export function StaticPwaSplash() {
  return (
    <div
      id="csp-static-splash"
      className="csp-static-splash safe-area-splash"
      aria-hidden
    >
      <div className="csp-static-splash-grid" aria-hidden />
      <div className="csp-static-splash-content">
        <Image
          src="/icon-192.png"
          alt=""
          width={128}
          height={128}
          className="csp-static-splash-logo"
          priority
        />
        <p className="csp-static-splash-eyebrow">Conscious spending</p>
        <div className="csp-static-splash-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
