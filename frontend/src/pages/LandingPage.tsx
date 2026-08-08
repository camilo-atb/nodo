import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg text-white font-sans overflow-x-hidden">
      {/* ─── Fixed Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-accent rotate-45 rounded-sm" />
              <div className="absolute w-1.5 h-1.5 bg-accent rounded-full" />
            </div>
            <span className="text-lg font-bold tracking-tight">NODO</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted">
            <button onClick={() => scrollTo('hero')} className="hover:text-white transition-colors">
              Discover
            </button>
            <button onClick={() => scrollTo('problem')} className="hover:text-white transition-colors">
              Why Nodo
            </button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors">
              How it works
            </button>
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors">
              Features
            </button>
          </div>

          <button
            onClick={() => navigate('/onboarding')}
            className="text-sm font-medium text-accent border border-accent/30 rounded-lg px-4 py-2 hover:bg-accent/10 transition-colors"
          >
            Get Started ↗
          </button>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'linear-gradient(to bottom, white 40%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to bottom, white 40%, transparent 90%)',
          }}
        />

        {/* Radial cyan glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 75% 20%, rgba(6,182,212,0.09), transparent 27%)',
          }}
        />

        {/* Animated network background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="landing-dot absolute top-[15%] left-[10%] w-2 h-2 bg-accent/30 rounded-full" />
          <div className="landing-dot absolute top-[25%] left-[80%] w-1.5 h-1.5 bg-green/30 rounded-full" style={{ animationDelay: '1s' }} />
          <div className="landing-dot absolute top-[60%] left-[15%] w-1 h-1 bg-accent/20 rounded-full" style={{ animationDelay: '2s' }} />
          <div className="landing-dot absolute top-[70%] left-[85%] w-2 h-2 bg-cyan/20 rounded-full" style={{ animationDelay: '0.5s' }} />
          <div className="landing-dot absolute top-[40%] left-[50%] w-1.5 h-1.5 bg-accent/25 rounded-full" style={{ animationDelay: '1.5s' }} />
          <div className="landing-dot absolute top-[80%] left-[40%] w-1 h-1 bg-green/20 rounded-full" style={{ animationDelay: '3s' }} />
          <div className="landing-dot absolute top-[20%] left-[60%] w-1.5 h-1.5 bg-accent/20 rounded-full" style={{ animationDelay: '2.5s' }} />
          {/* Connection lines */}
          <div className="landing-line absolute top-[18%] left-[12%] w-[200px] h-px bg-gradient-to-r from-accent/20 to-transparent rotate-12" style={{ animationDelay: '0.8s' }} />
          <div className="landing-line absolute top-[55%] left-[70%] w-[150px] h-px bg-gradient-to-r from-green/15 to-transparent -rotate-45" style={{ animationDelay: '1.8s' }} />
          <div className="landing-line absolute top-[35%] left-[25%] w-[180px] h-px bg-gradient-to-r from-accent/15 to-transparent rotate-6" style={{ animationDelay: '2.8s' }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-panel border border-border text-xs text-muted mb-8">
              <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
              The realtime talent network
            </div>

            {/* Title — massive, impactful */}
            <h1
              className="font-bold leading-[0.95] mb-6"
              style={{
                fontSize: 'clamp(58px, 10vw, 120px)',
                letterSpacing: '-0.075em',
              }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 40%, #06b6d4 100%)',
                }}
              >
                Build with
              </span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #ffffff 10%, #64748b 50%, #22d3ee 100%)',
                }}
              >
                the right
              </span>
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #e2e8f0 0%, #06b6d4 60%, #0891b2 100%)',
                }}
              >
                people.
              </span>
            </h1>

            {/* Tagline */}
            <p className="text-lg md:text-xl text-muted mb-3 max-w-lg">
              Discover talent. Validate skills. Build together — in real time.
            </p>

            {/* Description */}
            <p className="text-sm text-muted-2 mb-8 max-w-md">
              Nodo connects builders, designers, and thinkers through AI-powered matching.
              Find your team, prove your skills, and ship together.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/onboarding')}
                className="px-6 py-3 bg-accent text-bg font-semibold rounded-lg hover:bg-accent-2 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.25)]"
              >
                Get Started →
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="px-6 py-3 border border-border text-muted rounded-lg hover:border-muted hover:text-white transition-colors"
              >
                Explore opportunities
              </button>
            </div>
          </div>

          {/* Floating info cards — frosted glass style */}
          <div className="hidden lg:block">
            {/* Person card */}
            <div className="landing-card-in absolute top-[22%] right-[6%] w-60 rounded-xl p-4 shadow-2xl" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-sm font-bold text-accent border border-accent/20">
                  C
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Camilo R.</p>
                  <p className="text-xs text-muted">Full-stack Dev</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-md border border-accent/20">Go</span>
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-md border border-accent/20">Angular</span>
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-md border border-accent/20">PostgreSQL</span>
              </div>
            </div>

            {/* Team card */}
            <div className="landing-card-in absolute top-[50%] right-[14%] w-56 rounded-xl p-4 shadow-2xl" style={{ animationDelay: '0.6s' }}>
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1 font-medium">Team</p>
              <p className="text-sm font-semibold text-white mb-1.5">Health AI</p>
              <p className="text-xs text-muted mb-2">Needs · Go · PostgreSQL</p>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 bg-violet rounded-full border-2 border-[#0d0f17]" />
                <div className="w-6 h-6 bg-accent rounded-full border-2 border-[#0d0f17]" />
                <div className="w-6 h-6 bg-green rounded-full border-2 border-[#0d0f17]" />
              </div>
            </div>

            {/* Match card */}
            <div className="landing-card-in absolute top-[72%] right-[5%] w-56 rounded-xl p-4 shadow-2xl border-green/30" style={{ animationDelay: '0.9s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green/15 rounded-full flex items-center justify-center border border-green/30">
                  <span className="text-green text-sm">✓</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-green">94%</p>
                  <p className="text-[10px] text-muted uppercase tracking-wide">Match</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Your Go + backend experience aligns perfectly</p>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-8 left-0 right-0">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
              128 people online
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              24 matches happening now
            </div>
          </div>
        </div>
      </section>

      {/* ─── Signal Marquee ─── */}
      <section className="border-y border-border py-4 overflow-hidden bg-panel/50">
        <div className="landing-marquee-track flex whitespace-nowrap">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="text-sm text-muted-2 tracking-widest uppercase mx-6 shrink-0">
              PEOPLE ● IDEAS ◆ TEAMS □ AI MATCHING ✦ REALTIME ↗ SKILLS ◈ COLLABORATION ⬡ DISCOVERY ○
            </span>
          ))}
        </div>
      </section>

      {/* ─── Problem Section ─── */}
      <section id="problem" className="py-24 px-6 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Finding the right people<br />shouldn't be luck.
            </h2>
            <p className="text-muted text-base leading-relaxed max-w-lg">
              Hackathons, projects, and startups still rely on random encounters, outdated directories,
              or chaotic group chats to form teams. Nodo replaces luck with intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Old World Card */}
            <div className="rounded-xl border border-red/20 bg-red/[0.03] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red/10 border border-red/20 flex items-center justify-center text-red text-sm">
                  ✕
                </div>
                <span className="text-sm font-medium text-red/80">The old way</span>
              </div>
              <div className="space-y-2.5">
                {[
                  '"Anyone know a React dev? 🙏"',
                  '"Looking for ML person, DM me"',
                  '"Need designer ASAP, hackathon in 2h"',
                  '"Who here speaks Python??"',
                ].map((msg, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs text-slate-400"
                  >
                    {msg}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-2 mt-4">Unstructured. Noisy. Incomplete.</p>
            </div>

            {/* New World Card */}
            <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-sm">
                  ✓
                </div>
                <span className="text-sm font-medium text-accent/80">With Nodo</span>
              </div>
              <div className="space-y-3">
                <div className="px-3 py-2.5 rounded-lg bg-accent/[0.06] border border-accent/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">94% Match Found</span>
                    <span className="text-[10px] text-accent">AI verified</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Camilo — Go, PostgreSQL, REST APIs</p>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-accent/[0.06] border border-accent/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">87% Match Found</span>
                    <span className="text-[10px] text-accent">Skill validated</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Ana — React, TypeScript, UI Design</p>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-green/[0.06] border border-green/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white">Team Formed</span>
                    <span className="text-[10px] text-green">3 members</span>
                  </div>
                  <p className="text-[11px] text-slate-400">All skills covered · Ready to build</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-2 mt-4">Structured. Intelligent. Instant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">How it works</h2>
          <p className="text-muted mb-16 max-w-lg">
            From discovery to collaboration — four steps to building with the right people.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'DISCOVER',
                desc: 'Find events, projects and teams looking for talent.',
                icon: '◎',
                color: 'accent',
                tags: ['Search', 'Browse', 'Filter'],
              },
              {
                step: '02',
                title: 'MATCH',
                desc: 'AI analyzes your skills and suggests compatible teams.',
                icon: '⟡',
                color: 'violet',
                tags: ['AI', 'Scoring', 'Realtime'],
              },
              {
                step: '03',
                title: 'VALIDATE',
                desc: 'Prove what you know with realtime skill challenges.',
                icon: '△',
                color: 'green',
                tags: ['Challenge', 'Proof', 'Trust'],
              },
              {
                step: '04',
                title: 'COLLABORATE',
                desc: 'Build together on a shared workspace with your team.',
                icon: '□',
                color: 'amber',
                tags: ['Portal', 'Sync', 'Ship'],
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-panel border border-border rounded-xl p-6 hover:border-accent/30 transition-colors group relative overflow-hidden"
              >
                {/* Step number */}
                <div className="text-[64px] font-black absolute -top-2 -right-1 text-white/[0.03] leading-none pointer-events-none select-none">
                  {item.step}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg ${
                      item.color === 'accent'
                        ? 'border-accent/30 text-accent bg-accent/5'
                        : item.color === 'violet'
                          ? 'border-violet/30 text-violet bg-violet/5'
                          : item.color === 'green'
                            ? 'border-green/30 text-green bg-green/5'
                            : 'border-amber/30 text-amber bg-amber/5'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono text-accent font-bold">{item.step}</span>
                </div>
                <h3 className="text-sm font-bold tracking-wide text-white mb-2">{item.title}</h3>
                <p className="text-sm text-muted mb-4">{item.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features / CTA Section ─── */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Start building.
          </h2>
          <p className="text-muted mb-10 max-w-md mx-auto">
            Join a network of builders who validate skills and ship together, in real time.
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-accent text-bg font-semibold rounded-lg text-lg hover:bg-accent-2 transition-colors shadow-[0_0_30px_rgba(6,182,212,0.25)]"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted">
          <span>© 2026 Nodo</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green rounded-full" />
            System operational
          </div>
        </div>
      </footer>

      {/* ─── Inline Styles for Animations ─── */}
      <style>{`
        @keyframes landing-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .landing-marquee-track {
          animation: landing-marquee 40s linear infinite;
        }
        @keyframes landing-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 1; }
        }
        @keyframes landing-pulse-line {
          0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
          50% { opacity: 0.7; transform: scaleX(1); }
        }
        .landing-dot {
          animation: landing-float 6s ease-in-out infinite;
        }
        .landing-line {
          animation: landing-pulse-line 5s ease-in-out infinite;
          transform-origin: left center;
        }
        @keyframes landing-card-in {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .landing-card-in {
          background: rgba(13, 15, 23, 0.72);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          opacity: 0;
          animation: landing-card-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
