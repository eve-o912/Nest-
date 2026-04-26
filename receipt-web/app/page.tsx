'use client'

export default function Home() {
  return (
    <main 
      className="min-h-screen bg-gradient-to-b from-[#87CEEB] to-[#E0F7FA] text-[#111827]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
        {/* Header */}
        <header className="flex justify-between items-center px-8 lg:px-16 py-5">
          <h1 className="text-2xl font-bold text-[#111827]">Nest</h1>
          <nav className="hidden md:flex items-center gap-6">
            {['Home', 'Features', 'How It Works', 'Contact'].map((item) => (
              <a 
                key={item} 
                href="#" 
                className="text-[#111827] font-medium hover:text-[#1E88E5] transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
        </header>

        {/* Hero Section */}
        <section className="flex flex-col lg:flex-row items-center justify-between px-8 lg:px-16 py-12 lg:py-20 gap-12">
          <div className="max-w-[500px]" style={{ animation: 'fadeUp 0.6s ease both' }}>
            <h2 className="text-[40px] lg:text-[48px] font-bold leading-tight mb-5">
              Empowering Invisible Businesses
            </h2>
            <p className="text-lg text-[#374151] mb-8">
              Connecting small businesses to financial opportunities through verified digital identities.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-[#FF6F00] text-white border-0 px-7 py-3.5 rounded-lg cursor-pointer font-semibold hover:bg-[#e65c00] transition-colors">
                START FREE
              </button>
              <button className="bg-transparent border-2 border-[#1E88E5] text-[#1E88E5] px-6 py-3 rounded-lg cursor-pointer font-semibold hover:bg-[#1E88E5] hover:text-white transition-all">
                HOW IT WORKS
              </button>
            </div>
          </div>
          
          {/* Phone Mockup */}
          <div 
            className="w-[280px] h-[550px] bg-white rounded-[40px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] relative overflow-hidden"
            style={{ animation: 'floatPhone 6s ease-in-out infinite' }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#111827] rounded-full" />
            <div className="p-6 pt-16">
              <div className="text-center mb-6">
                <div className="text-sm text-[#6B7280] mb-1">Sales Dashboard</div>
                <div className="text-3xl font-bold text-[#111827]">2,475K</div>
              </div>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-[#CDDC39] to-[#AFB42B] rounded-xl p-4">
                  <div className="text-xs text-[#374151]">New Subscribers</div>
                  <div className="text-2xl font-bold text-[#111827]">153%</div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                  <div className="text-xs text-[#6B7280]">Monthly Revenue</div>
                  <div className="text-xl font-semibold text-[#111827]">$36,512</div>
                </div>
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                  <div className="text-xs text-[#6B7280]">Active Clients</div>
                  <div className="text-xl font-semibold text-[#111827]">71%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cards Section */}
        <section className="flex flex-wrap justify-center gap-5 px-8 py-12">
          {[
            { title: '2B+ POS Invisible Business', desc: 'Empowering small merchants globally.' },
            { title: '$5.2T Team Financing Gap', desc: 'Bridging the gap with verified data.' },
            { title: '90% Rejected Gap', desc: 'Financial passports for inclusion.' }
          ].map((card, i) => (
            <div 
              key={card.title}
              className="bg-[#CDDC39] rounded-2xl p-7 w-[280px] text-center shadow-[0_6px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-2.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] cursor-pointer"
              style={{ animation: `fadeUp 0.6s ${0.1 + i * 0.1}s ease both` }}
            >
              <h3 className="text-xl font-bold text-[#111827] mb-2.5">{card.title}</h3>
              <p className="text-base text-[#374151]">{card.desc}</p>
            </div>
          ))}
        </section>

        {/* How It Works Section */}
        <section className="flex flex-wrap justify-center gap-5 px-8 pb-20">
          {[
            { title: 'M-Pesa Daraja Integration', desc: 'Seamless mobile payments verified on blockchain.' },
            { title: 'Blockchain Verification', desc: 'Ensuring trust and transparency in every transaction.' }
          ].map((step, i) => (
            <div 
              key={step.title}
              className="bg-white rounded-2xl p-7 w-[280px] text-center shadow-[0_6px_20px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-2.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] cursor-pointer"
              style={{ animation: `fadeUp 0.6s ${0.4 + i * 0.1}s ease both` }}
            >
              <h4 className="text-[#1E88E5] font-semibold mb-2.5">{step.title}</h4>
              <p className="text-base text-[#374151]">{step.desc}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="text-center py-10 bg-[#E0F7FA] text-[#374151] text-sm">
          © 2026 Nest. All rights reserved.
        </footer>
      </main>
  )
}
