"use client"

import type { LucideIcon } from "lucide-react"
import {
  Banknote,
  BarChart3,
  CircleDollarSign,
  Coins,
  CreditCard,
  HandCoins,
  Landmark,
  LineChart,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react"
const MARQUEE_ICONS: LucideIcon[] = [
  PiggyBank,
  TrendingUp,
  Wallet,
  Receipt,
  LineChart,
  Coins,
  Banknote,
  CreditCard,
  Landmark,
  CircleDollarSign,
  BarChart3,
  HandCoins,
]

const ROW_COUNT = 22
const CELLS_PER_STRIP = 16

function iconsForRow(rowIndex: number) {
  return Array.from({ length: CELLS_PER_STRIP }, (_, i) => {
    const Icon = MARQUEE_ICONS[(rowIndex * 3 + i) % MARQUEE_ICONS.length]
    return Icon
  })
}

/** Checkerboard ±45° tilt like the reference wallpaper grid. */
function iconRotationDeg(row: number, col: number) {
  return (row + col) % 2 === 0 ? 45 : -45
}

type SplashMarqueeProps = {
  isConsole: boolean
  paused?: boolean
}

export function SplashMarquee({ isConsole, paused = false }: SplashMarqueeProps) {
  const iconColor = isConsole ? "rgba(218, 226, 253, 0.38)" : "rgba(79, 70, 229, 0.42)"

  return (
    <div
      className={`splash-marquee ${paused ? "splash-marquee--paused" : ""}`}
      aria-hidden
    >
      {Array.from({ length: ROW_COUNT }, (_, row) => {
        const icons = iconsForRow(row)
        const scrollLeft = row % 2 === 0

        return (
          <div
            key={row}
            className={`splash-marquee-row ${row % 2 === 1 ? "splash-marquee-row--stagger" : ""}`}
          >
            <div
              className={`splash-marquee-track ${scrollLeft ? "splash-marquee-track--left" : "splash-marquee-track--right"}`}
              style={{ animationDuration: `${32 + (row % 5) * 4}s` }}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="splash-marquee-strip">
                  {icons.map((Icon, i) => (
                    <span
                      key={`${copy}-${i}`}
                      className="splash-marquee-cell"
                      style={{
                        color: iconColor,
                        transform: `rotate(${iconRotationDeg(row, i)}deg)`,
                      }}
                    >
                      <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.75} />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
