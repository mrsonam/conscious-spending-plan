'use client'

import { useState, useEffect } from 'react'

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    const hideSplash = () => {
      setIsFading(true)
      setTimeout(() => {
        setIsVisible(false)
      }, 300)
    }

    if (document.readyState === 'complete') {
      setTimeout(hideSplash, 800)
    } else {
      window.addEventListener('load', () => {
        setTimeout(hideSplash, 800)
      })
      const maxTimer = setTimeout(hideSplash, 2000)
      return () => {
        clearTimeout(maxTimer)
        window.removeEventListener('load', hideSplash)
      }
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center safe-area-splash transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
          <img
            src="/next.svg"
            alt="Finance"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Conscious Spending Plan
        </h1>
        <div className="flex space-x-2 mt-4">
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  )
}
