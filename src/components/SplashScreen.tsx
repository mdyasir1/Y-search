'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      setTimeout(onDone, 600)
    }, 2500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 transition-opacity duration-600 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative">
        {/* Glow behind logo */}
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
        <img
          src="/Y logo.png"
          alt="Y Logo"
          className="relative w-28 h-28 md:w-36 md:h-36 object-contain animate-[bounceIn_0.8s_ease-out]"
          style={{ animation: 'bounceIn 0.8s ease-out' }}
        />
      </div>

      <h1 className="mt-6 text-3xl md:text-5xl font-extrabold text-white tracking-tight animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
        <span className="text-amber-400">Y</span> Search
      </h1>
      <p className="mt-2 text-amber-200/80 text-sm md:text-base font-medium animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
        SIR 2002 Electoral Roll Portal
      </p>
      <p className="mt-1 text-amber-200/40 text-xs animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
        Andhra Pradesh — Graduate MLC Constituencies
      </p>

      <div className="mt-10 flex gap-1.5 animate-[fadeInUp_0.6s_ease-out_0.9s_both]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-amber-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
          />
        ))}
      </div>

      <p className="absolute bottom-8 text-amber-200/20 text-xs tracking-widest">
        Built with care by Yasir
      </p>

      <style jsx>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
