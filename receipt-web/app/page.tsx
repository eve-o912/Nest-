'use client'

import Link from 'next/link'

// SVG Icons
const ChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const Check = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const Play = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const ArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const Zap = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)

const Shield = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// Phone Card Component
interface PhoneCardProps {
  title: string
  value: string
  subtitle: string
  color: string
  icon: React.ReactNode
  delay?: number
}

function PhoneCard({ title, value, subtitle, color, icon, delay = 0 }: PhoneCardProps) {
  return (
    <div 
      className="glass-card p-4 mb-3 transform transition-all duration-500 hover:scale-105"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sub font-medium">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-sub">{subtitle}</div>
    </div>
  )
}

// 3D Floating Element
function FloatingElement({ 
  children, 
  className = "", 
  delay = 0,
  style = {}
}: { 
  children: React.ReactNode
  className?: string
  delay?: number
  style?: React.CSSProperties
}) {
  return (
    <div 
      className={`absolute ${className}`}
      style={{
        animation: `float 6s ease-in-out ${delay}s infinite`,
        ...style
      }}
    >
      {children}
    </div>
  )
}

// Hexagon shape
function Hexagon({ className = "", color = "rgba(99, 102, 241, 0.3)" }: { className?: string, color?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill={color}>
      <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" />
    </svg>
  )
}

// Gradient Orb
function GradientOrb({ className = "", color = "from-blue-500 to-purple-500" }: { className?: string, color?: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-40 ${className} bg-gradient-to-br ${color}`} />
  )
}

export default function Home() {
  const navItems = [
    { label: 'Glasrnorph', hasDropdown: true },
    { label: 'Outtorte', hasDropdown: true },
    { label: 'Gradient', hasDropdown: true },
    { label: 'Shioe', hasDropdown: false },
    { label: 'Atrow', hasDropdown: false },
  ]

  const checkItems = [
    'Yeriany art tmeling',
    'Animated Groutt stums',
  ]

  const trustItems = [
    { icon: <Zap className="w-4 h-4" />, label: 'Fast' },
    { icon: <Shield className="w-4 h-4" />, label: 'Feature' },
    { icon: <Check className="w-4 h-4" />, label: 'Trust tring Foolis' },
  ]

  return (
    <main className="min-h-screen bg-bg relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <GradientOrb className="w-[800px] h-[800px] -top-40 -left-40" color="from-blue-600 via-purple-600 to-transparent" />
        <GradientOrb className="w-[600px] h-[600px] top-1/2 right-0" color="from-cyan-500 via-blue-500 to-transparent" />
        <GradientOrb className="w-[400px] h-[400px] bottom-0 left-1/4" color="from-purple-500 via-pink-500 to-transparent" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Nest</span>
          </Link>

          {/* Nav Items */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button 
                key={item.label}
                className="flex items-center gap-1 text-sm text-sub hover:text-white transition-colors"
              >
                {item.label}
                {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <button className="glass-button text-white text-sm">
            How It workss
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 pt-12 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Turn Your Daily Sales Into{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                  Financial Identity
                </span>{' '}
                Operating System
              </h1>
              
              <p className="text-lg text-sub max-w-lg">
                Get you get rrders sreert bushop of business sererien; tor nlb&apos;s apus or financial ere next.
              </p>

              {/* Check Items */}
              <div className="flex flex-wrap gap-6">
                {checkItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-sub">
                    <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <button className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                  Start Free
                </button>
                <button className="glass-button flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  How it work
                </button>
              </div>

              {/* Trust Items */}
              <div className="flex items-center gap-6 pt-4">
                {trustItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-sub">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      {item.icon}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Phone Mockups */}
            <div className="relative h-[600px] lg:h-[700px]">
              {/* Floating 3D Elements */}
              <FloatingElement className="top-10 left-0" delay={0}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </FloatingElement>

              <FloatingElement className="top-20 right-10" delay={1}>
                <Hexagon className="w-12 h-12" color="rgba(99, 102, 241, 0.4)" />
              </FloatingElement>

              <FloatingElement className="bottom-40 left-10" delay={2}>
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20" />
              </FloatingElement>

              <FloatingElement className="top-1/3 right-0" delay={0.5}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-400" />
              </FloatingElement>

              {/* Phone 1 - Back (Left) */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-64 transform -rotate-12 scale-90 opacity-80"
                style={{ animation: 'float 8s ease-in-out infinite' }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-[40px] blur-xl" />
                  <div className="relative bg-gradient-to-b from-blue-600 to-cyan-400 rounded-[40px] p-4 shadow-2xl">
                    <div className="bg-white/10 backdrop-blur-md rounded-[32px] p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
                        <div className="text-xs text-white font-medium">Rearr Buttth</div>
                      </div>
                      <div className="text-3xl font-bold text-white mb-1">1350%</div>
                      <div className="text-xs text-white/70 mb-4">Cteantiny</div>
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-white">254</div>
                        <div className="text-xs text-white/70">/30 Order</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone 2 - Main (Center) */}
              <div 
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 z-20"
                style={{ animation: 'float 6s ease-in-out 1s infinite' }}
              >
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-[50px] blur-2xl" />
                  <div className="relative bg-gradient-to-b from-white via-gray-100 to-gray-300 rounded-[48px] p-3 shadow-2xl">
                    {/* Notch */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
                    
                    <div className="bg-gradient-to-b from-slate-100 to-white rounded-[40px] overflow-hidden pt-8">
                      {/* Status Bar */}
                      <div className="flex items-center justify-between px-4 py-2 text-xs">
                        <span className="font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="text-xs text-gray-500 mb-1">S S6Mers ratiics</div>
                        
                        {/* Main Card */}
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 mb-3 text-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs opacity-80">Storayc-PriBat</span>
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="text-3xl font-bold mb-1">153 %</div>
                          <div className="text-xs opacity-80">New s1ob</div>
                        </div>

                        {/* Secondary Stats */}
                        <div className="flex gap-2 mb-3">
                          <div className="flex-1 bg-white rounded-xl p-2 shadow-sm">
                            <div className="text-xs text-gray-400 mb-1">Ar Pedy</div>
                            <div className="text-sm font-semibold">Aff Pldis</div>
                          </div>
                          <div className="flex-1 bg-white rounded-xl p-2 shadow-sm">
                            <div className="text-xs text-gray-400 mb-1">Freedy oft</div>
                            <div className="text-sm font-semibold">Quilf Rue</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone 3 - Right */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 w-64 transform rotate-12 scale-90 opacity-80 z-10"
                style={{ animation: 'float 7s ease-in-out 0.5s infinite' }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-pink-500/20 to-purple-500/20 rounded-[40px] blur-xl" />
                  <div className="relative bg-gradient-to-b from-pink-500 to-green-400 rounded-[40px] p-4 shadow-2xl">
                    <div className="bg-white/10 backdrop-blur-md rounded-[32px] p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs text-white font-medium">Fleyuing Dora</div>
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      </div>
                      <div className="text-3xl font-bold text-white mb-4">24754M</div>
                      
                      {/* Circular Chart */}
                      <div className="relative w-24 h-24 mx-auto">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                          <circle cx="48" cy="48" r="40" fill="none" stroke="white" strokeWidth="8" strokeDasharray="200" strokeDashoffset="50" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs text-white font-bold">
                            at
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating particles */}
              <FloatingElement className="bottom-20 left-1/4" delay={1.5}>
                <div className="w-6 h-6 rounded-full bg-purple-500/30 blur-sm" />
              </FloatingElement>
              <FloatingElement className="top-32 right-1/4" delay={2.5}>
                <div className="w-4 h-4 rounded-full bg-blue-400/40" />
              </FloatingElement>
            </div>
          </div>
        </div>
      </section>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(2deg);
          }
        }
      `}</style>
    </main>
  )
}
