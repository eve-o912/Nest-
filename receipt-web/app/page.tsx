'use client'

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        
        .homepage-dark { font-family: 'DM Sans', sans-serif; }
        .font-syne { font-family: 'Syne', sans-serif; }
        
        @keyframes drift1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(22px,-28px)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-14px,18px)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-14px)} }
        @keyframes ringPulse { 0%,100%{opacity:0.35} 50%{opacity:0.08} }
        @keyframes spinGem { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes floatPhone { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-18px) rotate(-3deg)} }
        @keyframes growBar { from{width:0} }
        @keyframes fc1Float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fc2Float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes pt1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-14px,9px)} }
        @keyframes pt2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(10px,-18px)} }
        @keyframes pt3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-8px,12px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
      `}} />

      <main className="homepage-dark min-h-screen bg-[#050a1e] text-white overflow-x-hidden relative">
        {/* Background Layer */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 60% at 18% 50%, rgba(13,32,96,0.95) 0%, transparent 70%),
              radial-gradient(ellipse 50% 50% at 78% 18%, rgba(37,99,255,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 68% 80%, rgba(0,212,255,0.09) 0%, transparent 60%)
            `
          }} />
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `
              linear-gradient(rgba(37,99,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(37,99,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }} />
          <div className="absolute w-80 h-80 rounded-full blur-[70px] opacity-45 top-[28%] -left-[6%]" style={{ background: 'rgba(37,99,255,0.35)', animation: 'drift1 8s ease-in-out infinite' }} />
          <div className="absolute w-56 h-56 rounded-full blur-[70px] opacity-45 top-[58%] left-[38%]" style={{ background: 'rgba(0,212,255,0.22)', animation: 'drift2 10s ease-in-out infinite' }} />
          <div className="absolute w-40 h-40 rounded-full blur-[70px] opacity-45 bottom-[8%] right-[18%]" style={{ background: 'rgba(255,107,26,0.18)', animation: 'drift3 7s ease-in-out infinite' }} />
        </div>

        {/* Navigation */}
        <nav className="relative z-[100] flex items-center justify-between px-8 lg:px-16 py-5 border-b border-white/[0.07] backdrop-blur-xl bg-[rgba(3,5,15,0.45)]">
          <div className="flex items-center gap-2.5 font-syne font-extrabold text-[22px]">
            <div className="w-[34px] h-[34px] bg-gradient-to-br from-[#2563ff] to-[#00d4ff] rounded-[9px] flex items-center justify-center text-[17px]">
              ⚡
            </div>
            Nest
          </div>
          <div className="hidden md:flex items-center gap-1">
            {['Glasmorph', 'Outlorite', 'Gradient'].map((item) => (
              <button key={item} className="flex items-center gap-1 px-4 py-2 text-sm text-white/[0.68] rounded-lg transition-all hover:text-white hover:bg-white/5 cursor-pointer">
                {item} <span className="text-[9px] opacity-55">▾</span>
              </button>
            ))}
            {['Shipe', 'Atrow'].map((item) => (
              <button key={item} className="px-4 py-2 text-sm text-white/[0.68] rounded-lg transition-all hover:text-white hover:bg-white/5 cursor-pointer">
                {item}
              </button>
            ))}
          </div>
          <button className="px-6 py-2.5 border border-white/[0.28] rounded-full text-sm text-white transition-all hover:bg-white/[0.08] hover:border-white/[0.55]">
            How it works
          </button>
        </nav>

        {/* Hero */}
        <section className="relative z-10 grid lg:grid-cols-2 items-center min-h-[calc(100vh-73px)] px-8 lg:px-16 py-12 lg:py-20 gap-12">
          {/* Left */}
          <div className="max-w-[620px]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(37,99,255,0.14)] border border-[rgba(37,99,255,0.32)] text-xs text-[#00d4ff] font-medium tracking-wider mb-7" style={{ animation: 'fadeUp 0.6s ease both' }}>
              <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full animate-[pulse_2s_ease_infinite]" />
              AI-Powered Sales Intelligence
            </div>

            <h1 className="font-syne font-extrabold text-[clamp(34px,3.8vw,54px)] leading-[1.1] tracking-tight mb-6" style={{ animation: 'fadeUp 0.6s 0.1s ease both' }}>
              Turn Your Daily Sales Into{' '}
              <span className="bg-gradient-to-br from-[#00d4ff] to-[#2563ff] bg-clip-text text-transparent">Brand Identity</span>{' '}
              Operating System
            </h1>

            <p className="text-[15.5px] leading-[1.75] text-[#8a9bc4] max-w-[470px] mb-8" style={{ animation: 'fadeUp 0.6s 0.2s ease both' }}>
              Get instant insights and automate your business operations. Built for entrepreneurs, agencies, and financial teams ready for what&apos;s next.
            </p>

            <div className="flex flex-wrap gap-5 mb-10" style={{ animation: 'fadeUp 0.6s 0.3s ease both' }}>
              {['Yearly & monthly plans', 'Animated growth charts'].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-[13px] text-white/[0.72]">
                  <div className="w-5 h-5 rounded-md bg-[rgba(37,99,255,0.2)] border border-[rgba(37,99,255,0.42)] flex items-center justify-center text-[11px]">✓</div>
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3.5 items-center mb-12" style={{ animation: 'fadeUp 0.6s 0.4s ease both' }}>
              <button className="px-8 py-3.5 rounded-full bg-gradient-to-br from-[#ff6b1a] to-[#ffb347] text-white font-semibold text-[15px] shadow-[0_8px_32px_rgba(255,107,26,0.38)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(255,107,26,0.52)]">
                Start Free →
              </button>
              <button className="px-7 py-3.5 rounded-full border border-white/[0.22] bg-transparent text-[15px] transition-all hover:bg-white/5 hover:border-white/[0.42]">
                How it works
              </button>
            </div>

            <div className="flex items-center gap-3.5" style={{ animation: 'fadeUp 0.6s 0.5s ease both' }}>
              <span className="text-[13px] text-[#8a9bc4]">Trusted by</span>
              <div className="flex gap-2.5 items-center">
                {['Garage', 'Feature', '🔒 Trust Tools'].map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1 rounded-full border border-white/[0.11] bg-white/[0.04] text-white/[0.58]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Phone & Floats */}
          <div className="relative flex justify-center items-center h-[600px]" style={{ animation: 'fadeUp 0.7s 0.2s ease both' }}>
            {/* Glow Rings */}
            <div className="absolute w-[380px] h-[380px] rounded-full border border-[rgba(37,99,255,0.18)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ringPulse_4s_ease-in-out_infinite]" />
            <div className="absolute w-[510px] h-[510px] rounded-full border border-[rgba(37,99,255,0.18)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ringPulse_4s_1.5s_ease-in-out_infinite]" />

            {/* Spinning Gem */}
            <div 
              className="absolute top-[22px] right-[55px] w-[66px] h-[66px] opacity-90 animate-[spinGem_22s_linear_infinite]"
              style={{ 
                background: 'linear-gradient(135deg, #a855f7, #2563ff, #00d4ff)',
                clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)',
                filter: 'drop-shadow(0 0 18px rgba(168,85,247,0.65))'
              }}
            />

            {/* Float Card Top Right */}
            <div className="absolute -right-5 top-14 w-[168px] z-10 p-4 rounded-2xl bg-[rgba(10,15,45,0.88)] backdrop-blur-xl border border-white/10 animate-[fc1Float_7s_ease-in-out_infinite]">
              <div className="text-[9px] text-[#8a9bc4] mb-1">Sales Analytics</div>
              <div className="font-syne text-[19px] font-extrabold bg-gradient-to-br from-[#ff6b1a] to-[#ffb347] bg-clip-text text-transparent">+1,350%</div>
              <div className="text-[9px] text-white/[0.38] mt-0.5">Revenue growth</div>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] mt-1.5 bg-[rgba(52,211,153,0.14)] text-[#34d399]">↑ 24.5% this month</div>
            </div>

            {/* Phone */}
            <div className="relative z-[5] animate-[floatPhone_6s_ease-in-out_infinite]">
              <div className="w-[226px] h-[465px] bg-gradient-to-br from-[#1a1f3e] to-[#0d1128] rounded-[36px] border border-white/[0.14] shadow-[0_40px_100px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden relative">
                <div className="w-[78px] h-[22px] bg-[#07091a] rounded-b-2xl mx-auto mb-2.5" />
                <div className="px-3">
                  <div className="flex justify-between items-center mb-2.5 text-[9.5px] text-white/[0.45]">
                    <span>Sales Dashboard</span>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff6b1a] to-[#ffb347]" />
                  </div>

                  <div className="rounded-[13px] p-2.5 mb-2 bg-gradient-to-br from-[rgba(37,99,255,0.28)] to-[rgba(0,212,255,0.13)] border border-[rgba(37,99,255,0.3)]">
                    <div className="text-[9px] text-white/[0.45] mb-0.5">New Subscribers</div>
                    <div className="font-syne text-[23px] font-extrabold bg-gradient-to-br from-[#ff6b1a] to-[#ffb347] bg-clip-text text-transparent">153%</div>
                    <div className="h-1 bg-white/[0.09] rounded-sm mt-1.5 overflow-hidden">
                      <div className="h-full rounded-sm bg-gradient-to-r from-[#ff6b1a] to-[#ffb347] w-3/4 animate-[growBar_2s_1s_ease_both]" />
                    </div>
                  </div>

                  <div className="rounded-[13px] p-2.5 mb-2 bg-gradient-to-br from-[rgba(0,212,255,0.2)] to-[rgba(37,99,255,0.1)] border border-[rgba(0,212,255,0.25)]">
                    <div className="text-[9px] text-white/[0.45] mb-0.5">Flying Data</div>
                    <div className="font-syne text-[23px] font-extrabold bg-gradient-to-br from-[#00d4ff] to-[#2563ff] bg-clip-text text-transparent">2,475K</div>
                    <div className="h-1 bg-white/[0.09] rounded-sm mt-1.5 overflow-hidden">
                      <div className="h-full rounded-sm bg-gradient-to-r from-[#2563ff] to-[#00d4ff] w-[62%] animate-[growBar_2s_1.2s_ease_both]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-2">
                    {[
                      { dot: '#34d399', label: 'All Clients', val: '71%' },
                      { dot: '#a855f7', label: 'Revenue', val: '88%' },
                      { dot: '#ff6b1a', label: 'Conversions', val: '54%' }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] text-white/[0.55]">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                        {item.label}
                        <span className="ml-auto font-semibold text-white">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Float Card Bottom Left */}
            <div className="absolute -left-7 bottom-24 w-[158px] z-10 p-4 rounded-2xl bg-[rgba(10,15,45,0.88)] backdrop-blur-xl border border-white/10 animate-[fc2Float_8s_1s_ease-in-out_infinite]">
              <div className="text-[9px] text-[#8a9bc4] mb-1">Source Performance</div>
              <div className="font-syne text-[19px] font-extrabold text-[#34d399]">$36,512</div>
              <div className="text-[9px] text-white/[0.38] mt-0.5">Monthly recurring</div>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] mt-1.5 bg-[rgba(52,211,153,0.14)] text-[#34d399]">↑ Active leads</div>
            </div>

            {/* Particles */}
            <div className="absolute w-2 h-2 rounded-full bg-[#ff6b1a] top-[14%] left-[54%] opacity-85 animate-[pt1_5s_ease-in-out_infinite]" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#a855f7] top-[73%] left-[28%] opacity-60 animate-[pt2_7s_ease-in-out_infinite]" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#00d4ff] top-[38%] right-[14%] opacity-72 animate-[pt3_6s_ease-in-out_infinite]" />
          </div>
        </section>
      </main>
    </>
  )
}
