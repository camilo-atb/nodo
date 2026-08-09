import { useNavigate } from 'react-router-dom';

export function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="nodo-landing">
      {/* ─── Fixed Navigation ─── */}
      <nav className="nodo-nav">
        <div className="nodo-nav-inner">
          <div className="nodo-nav-logo">
            <svg className="nodo-logo-svg" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
              <circle cx="6" cy="6" r="2.3"/>
              <circle cx="18" cy="6" r="2.3"/>
              <circle cx="12" cy="18" r="2.3"/>
              <path d="M8 7.2l7.7 0M7.2 8l3.7 7.5M16.8 8l-3.7 7.5"/>
            </svg>
            <span className="nodo-logo-text">NODO</span>
          </div>

          <div className="nodo-nav-links">
            <button onClick={() => scrollTo('hero')}>Discover</button>
            <button onClick={() => scrollTo('problem')}>Why Nodo</button>
            <button onClick={() => scrollTo('how-it-works')}>How it works</button>
            <button onClick={() => scrollTo('features')}>Features</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                const html = document.documentElement;
                html.classList.toggle('dark');
                localStorage.setItem('nodo-theme', html.classList.contains('dark') ? 'dark' : 'light');
              }}
              className="nodo-theme-toggle"
              aria-label="Toggle theme"
            >
              <span className="nodo-theme-sun">☀</span>
              <span className="nodo-theme-moon">☾</span>
            </button>
            <button onClick={() => navigate('/onboarding')} className="nodo-nav-cta">
              Get Started ↗
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section id="hero" className="nodo-hero">
        {/* Background canvas effect */}
        <div className="nodo-hero-bg" />
        <div className="nodo-hero-glow" />

        {/* Hero content — CENTERED */}
        <div className="nodo-hero-content">
          {/* Badge */}
          <div className="nodo-hero-badge">
            <span className="nodo-badge-dot" />
            The realtime talent network
          </div>

          {/* Title */}
          <h1 className="nodo-hero-title">
            Build with<br />
            <span className="nodo-gradient">the right people.</span>
          </h1>

          {/* Tagline */}
          <p className="nodo-hero-tagline">
            Discover talent. Validate skills. Build together — in real time.
          </p>

          {/* Description */}
          <p className="nodo-hero-description">
            Nodo connects builders, designers, and thinkers through AI-powered matching.
            Find your team, prove your skills, and ship together.
          </p>

          {/* CTA Buttons */}
          <div className="nodo-hero-actions">
            <button onClick={() => navigate('/onboarding')} className="nodo-btn-primary">
              Get Started →
            </button>
            <button onClick={() => navigate('/discover')} className="nodo-btn-secondary">
              Explore opportunities
            </button>
          </div>
        </div>

        {/* Floating network cards */}
        <div className="nodo-network-card nodo-card-camilo">
          <div className="nodo-card-header">
            <div className="nodo-card-avatar">C</div>
            <div>
              <p className="nodo-card-name">Camilo R.</p>
              <p className="nodo-card-role">Full-stack Dev</p>
            </div>
          </div>
          <div className="nodo-card-tags">
            <span>Go</span>
            <span>Angular</span>
            <span>PostgreSQL</span>
          </div>
        </div>

        <div className="nodo-network-card nodo-card-health">
          <p className="nodo-card-eyebrow">Team</p>
          <p className="nodo-card-name">Health AI</p>
          <p className="nodo-card-role">Needs · Go · PostgreSQL</p>
          <div className="nodo-card-avatars">
            <div className="nodo-mini-avatar nodo-av-violet" />
            <div className="nodo-mini-avatar nodo-av-cyan" />
            <div className="nodo-mini-avatar nodo-av-green" />
          </div>
        </div>

        <div className="nodo-network-card nodo-card-match">
          <div className="nodo-match-row">
            <div className="nodo-match-icon">✓</div>
            <div>
              <p className="nodo-match-score">94%</p>
              <p className="nodo-card-eyebrow">Match</p>
            </div>
          </div>
          <p className="nodo-match-detail">Your Go + backend experience aligns perfectly</p>
        </div>

        {/* Bottom status bar */}
        <div className="nodo-hero-status">
          <div className="nodo-status-item">
            <span className="nodo-status-dot nodo-dot-green" />
            Realtime collaboration
          </div>
          <div className="nodo-status-item">
            <span className="nodo-status-dot nodo-dot-cyan" />
            AI-powered matching
          </div>
        </div>
      </section>

      {/* ─── Signal Marquee ─── */}
      <section className="nodo-marquee-section">
        <div className="nodo-marquee-track">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="nodo-marquee-item">
              PEOPLE ● IDEAS ◆ TEAMS ■ AI MATCHING ✦ REALTIME ● SKILLS ◆ COLLABORATION ■ DISCOVERY ●
            </span>
          ))}
        </div>
      </section>

      {/* ─── Problem Section ─── */}
      <section id="problem" className="nodo-section nodo-section-border">
        <div className="nodo-container">
          <div className="nodo-section-header">
            <h2 className="nodo-section-title">
              Finding the right people<br />shouldn&apos;t be luck.
            </h2>
            <p className="nodo-section-desc">
              Hackathons, projects, and startups still rely on random encounters, outdated directories,
              or chaotic group chats to form teams. Nodo replaces luck with intelligence.
            </p>
          </div>

          <div className="nodo-problem-grid">
            {/* Old World Card */}
            <div className="nodo-problem-card nodo-problem-old">
              <div className="nodo-problem-header">
                <div className="nodo-problem-icon nodo-icon-red">✕</div>
                <span className="nodo-problem-label nodo-label-red">The old way</span>
              </div>
              <div className="nodo-problem-messages">
                {[
                  '"Anyone know a React dev? 🙏"',
                  '"Looking for ML person, DM me"',
                  '"Need designer ASAP, hackathon in 2h"',
                  '"Who here speaks Python??"',
                ].map((msg, i) => (
                  <div key={i} className="nodo-problem-msg">{msg}</div>
                ))}
              </div>
              <p className="nodo-problem-footer">Unstructured. Noisy. Incomplete.</p>
            </div>

            {/* New World Card */}
            <div className="nodo-problem-card nodo-problem-new">
              <div className="nodo-problem-header">
                <div className="nodo-problem-icon nodo-icon-cyan">✓</div>
                <span className="nodo-problem-label nodo-label-cyan">With Nodo</span>
              </div>
              <div className="nodo-problem-matches">
                <div className="nodo-match-item">
                  <div className="nodo-match-item-header">
                    <span className="nodo-match-item-title">94% Match Found</span>
                    <span className="nodo-match-item-badge">AI verified</span>
                  </div>
                  <p className="nodo-match-item-desc">Camilo — Go, PostgreSQL, REST APIs</p>
                </div>
                <div className="nodo-match-item">
                  <div className="nodo-match-item-header">
                    <span className="nodo-match-item-title">87% Match Found</span>
                    <span className="nodo-match-item-badge">Skill validated</span>
                  </div>
                  <p className="nodo-match-item-desc">Ana — React, TypeScript, UI Design</p>
                </div>
                <div className="nodo-match-item nodo-match-green">
                  <div className="nodo-match-item-header">
                    <span className="nodo-match-item-title">Team Formed</span>
                    <span className="nodo-match-item-badge nodo-badge-green">3 members</span>
                  </div>
                  <p className="nodo-match-item-desc">All skills covered · Ready to build</p>
                </div>
              </div>
              <p className="nodo-problem-footer">Structured. Intelligent. Instant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section id="how-it-works" className="nodo-section">
        <div className="nodo-container">
          <h2 className="nodo-section-title">How it works</h2>
          <p className="nodo-section-desc nodo-mb-16">
            From discovery to collaboration — four steps to building with the right people.
          </p>

          <div className="nodo-steps-grid">
            {[
              { step: '01', title: 'DISCOVER', desc: 'Find events, projects and teams looking for talent.', icon: '◎', tags: ['Search', 'Browse', 'Filter'] },
              { step: '02', title: 'MATCH', desc: 'AI analyzes your skills and suggests compatible teams.', icon: '⟡', tags: ['AI', 'Scoring', 'Realtime'] },
              { step: '03', title: 'VALIDATE', desc: 'Prove what you know with realtime skill challenges.', icon: '△', tags: ['Challenge', 'Proof', 'Trust'] },
              { step: '04', title: 'COLLABORATE', desc: 'Build together on a shared workspace with your team.', icon: '□', tags: ['Portal', 'Sync', 'Ship'] },
            ].map((item) => (
              <div key={item.step} className="nodo-step-card">
                <div className="nodo-step-number">{item.step}</div>
                <div className="nodo-step-icon">{item.icon}</div>
                <span className="nodo-step-label">{item.step}</span>
                <h3 className="nodo-step-title">{item.title}</h3>
                <p className="nodo-step-desc">{item.desc}</p>
                <div className="nodo-step-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="nodo-step-tag">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features / CTA Section ─── */}
      <section id="features" className="nodo-section nodo-section-border-top">
        <div className="nodo-container nodo-text-center">
          <h2 className="nodo-cta-title">Start building.</h2>
          <p className="nodo-cta-desc">
            Join a network of builders who validate skills and ship together, in real time.
          </p>
          <button onClick={() => navigate('/onboarding')} className="nodo-btn-primary nodo-btn-large">
            Get Started
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="nodo-footer">
        <div className="nodo-container nodo-footer-inner">
          <span>© 2026 Nodo</span>
          <div className="nodo-footer-status">
            <span className="nodo-status-dot nodo-dot-green" />
            System operational
          </div>
        </div>
      </footer>

      {/* ─── Styles ─── */}
      <style>{`
        /* ═══ BASE ═══ */
        .nodo-landing {
          min-height: 100vh;
          background: radial-gradient(circle at 75% 20%, rgba(6,182,212,0.09), transparent 27%), #07080d;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow-x: hidden;
        }

        /* ═══ LIGHT MODE ═══ */
        html:not(.dark) .nodo-landing {
          background: radial-gradient(circle at 75% 20%, rgba(6,182,212,0.06), transparent 27%), #f7f8fa;
          color: #111318;
        }
        html:not(.dark) .nodo-nav {
          background: rgba(255,255,255,0.9) !important;
          border-bottom-color: #e5e7eb !important;
        }
        html:not(.dark) .nodo-logo-text { color: #111318; }
        html:not(.dark) .nodo-nav-links { color: #6b7280; }
        html:not(.dark) .nodo-nav-links button:hover { color: #111318; }
        html:not(.dark) .nodo-hero-title { color: #111318; }
        html:not(.dark) .nodo-gradient {
          background: linear-gradient(100deg, #111318 20%, #4b5563 50%, #0891b2 90%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        html:not(.dark) .nodo-hero-tagline { color: #4b5563; }
        html:not(.dark) .nodo-hero-description { color: #6b7280; }
        html:not(.dark) .nodo-hero-badge { border-color: rgba(52,211,153,0.25); background: rgba(52,211,153,0.06); color: #6b7280; }
        html:not(.dark) .nodo-btn-secondary { color: #6b7280; border-color: #e5e7eb; }
        html:not(.dark) .nodo-btn-secondary:hover { border-color: #111318; color: #111318; }
        html:not(.dark) .nodo-network-card { background: rgba(255,255,255,0.9); border-color: #e5e7eb; box-shadow: 0 15px 60px rgba(0,0,0,0.08); }
        html:not(.dark) .nodo-card-name { color: #111318; }
        html:not(.dark) .nodo-card-role { color: #6b7280; }
        html:not(.dark) .nodo-card-eyebrow { color: #9ca3af; }
        html:not(.dark) .nodo-match-detail { color: #6b7280; }
        html:not(.dark) .nodo-hero-status { color: #6b7280; }
        html:not(.dark) .nodo-marquee-section { border-color: #e5e7eb; background: rgba(255,255,255,0.5); }
        html:not(.dark) .nodo-marquee-item { color: #d1d5db; }
        html:not(.dark) .nodo-section-title { color: #111318; }
        html:not(.dark) .nodo-section-desc { color: #6b7280; }
        html:not(.dark) .nodo-section-border { border-bottom-color: #e5e7eb; }
        html:not(.dark) .nodo-section-border-top { border-top-color: #e5e7eb; }
        html:not(.dark) .nodo-problem-msg { background: rgba(0,0,0,0.03); border-color: #e5e7eb; color: #6b7280; }
        html:not(.dark) .nodo-problem-footer { color: #9ca3af; }
        html:not(.dark) .nodo-match-item-title { color: #111318; }
        html:not(.dark) .nodo-match-item-desc { color: #6b7280; }
        html:not(.dark) .nodo-step-card { background: #fff; border-color: #e5e7eb; }
        html:not(.dark) .nodo-step-card:hover { border-color: rgba(6,182,212,0.4); }
        html:not(.dark) .nodo-step-number { color: rgba(0,0,0,0.03); }
        html:not(.dark) .nodo-step-title { color: #111318; }
        html:not(.dark) .nodo-step-desc { color: #6b7280; }
        html:not(.dark) .nodo-step-tag { background: #f3f4f6; border-color: #e5e7eb; color: #6b7280; }
        html:not(.dark) .nodo-cta-title { color: #111318; }
        html:not(.dark) .nodo-cta-desc { color: #6b7280; }
        html:not(.dark) .nodo-footer { border-top-color: #e5e7eb; }
        html:not(.dark) .nodo-footer-inner { color: #6b7280; }
        html:not(.dark) .nodo-hero-bg { opacity: 0.02; background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px); }

        /* ═══ NAV ═══ */
        .nodo-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          background: rgba(7,8,13,0.8); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .nodo-nav-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 24px;
          height: 64px; display: flex; align-items: center; justify-content: space-between;
        }
        .nodo-nav-logo { display: flex; align-items: center; gap: 8px; }
        .nodo-logo-svg { width: 24px; height: 24px; }
        .nodo-logo-text { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
        .nodo-nav-links { display: none; align-items: center; gap: 32px; font-size: 14px; color: #94a3b8; }
        .nodo-nav-links button { background: none; border: none; color: inherit; cursor: pointer; transition: color 0.2s; }
        .nodo-nav-links button:hover { color: #fff; }
        .nodo-nav-cta {
          font-size: 14px; font-weight: 500; color: #06b6d4;
          border: 1px solid rgba(6,182,212,0.3); border-radius: 8px;
          padding: 8px 16px; background: none; cursor: pointer; transition: background 0.2s;
        }
        .nodo-nav-cta:hover { background: rgba(6,182,212,0.1); }
        .nodo-theme-toggle {
          width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
          background: none; cursor: pointer; display: grid; place-items: center;
          font-size: 16px; transition: all 0.2s;
        }
        .nodo-theme-toggle:hover { border-color: rgba(6,182,212,0.4); }
        .nodo-theme-sun { display: none; }
        .nodo-theme-moon { display: inline; color: #94a3b8; }
        html:not(.dark) .nodo-theme-sun { display: inline; color: #f59e0b; }
        html:not(.dark) .nodo-theme-moon { display: none; }
        html:not(.dark) .nodo-theme-toggle { border-color: #e5e7eb; }
        html:not(.dark) .nodo-theme-toggle:hover { border-color: rgba(6,182,212,0.4); }
        @media (min-width: 768px) { .nodo-nav-links { display: flex; } }

        /* ═══ HERO ═══ */
        .nodo-hero {
          min-height: 100vh; position: relative;
          display: flex; align-items: center; justify-content: center;
          padding-top: 100px; overflow: hidden;
        }
        .nodo-hero-bg {
          position: absolute; inset: 0; opacity: 0.04;
          background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: linear-gradient(to bottom, white 40%, transparent 90%);
          -webkit-mask-image: linear-gradient(to bottom, white 40%, transparent 90%);
        }
        .nodo-hero-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 75% 20%, rgba(6,182,212,0.09), transparent 27%);
        }

        /* Hero content — CENTERED */
        .nodo-hero-content {
          position: relative; z-index: 5; width: 100%; text-align: center;
          padding: 0 24px;
        }

        /* Badge */
        .nodo-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          margin-bottom: 30px; padding: 7px 12px;
          border: 1px solid rgba(52,211,153,0.16); border-radius: 999px;
          background: rgba(52,211,153,0.04);
          font-size: 12px; color: #94a3b8;
        }
        .nodo-badge-dot {
          width: 8px; height: 8px; background: #34d399; border-radius: 50%;
          animation: nodo-pulse 2s ease-in-out infinite;
        }

        /* Title */
        .nodo-hero-title {
          max-width: 1000px; margin: 0 auto;
          font-size: clamp(58px, 8.4vw, 122px);
          line-height: 0.88; letter-spacing: -0.075em; font-weight: 700;
          color: #fff;
        }
        .nodo-gradient {
          background: linear-gradient(100deg, #fff 20%, #cbd5e1 50%, #67e8f9 90%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        /* Tagline */
        .nodo-hero-tagline {
          margin-top: 30px; color: #b4bcc9;
          font-size: clamp(16px, 2vw, 20px); font-weight: 500; letter-spacing: -0.02em;
        }

        /* Description */
        .nodo-hero-description {
          max-width: 610px; margin: 17px auto 0; color: #737c8d;
          font-size: 15px; line-height: 1.7;
        }

        /* Actions */
        .nodo-hero-actions {
          display: flex; justify-content: center; gap: 10px; margin-top: 32px;
        }
        .nodo-btn-primary {
          padding: 12px 24px; background: #06b6d4; color: #041116;
          font-weight: 600; font-size: 14px; border: none; border-radius: 8px;
          cursor: pointer; transition: background 0.2s;
          box-shadow: 0 0 20px rgba(6,182,212,0.25);
        }
        .nodo-btn-primary:hover { background: #22d3ee; }
        .nodo-btn-large { padding: 16px 32px; font-size: 18px; box-shadow: 0 0 30px rgba(6,182,212,0.25); }
        .nodo-btn-secondary {
          padding: 12px 24px; background: none; color: #94a3b8;
          font-size: 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
          cursor: pointer; transition: all 0.2s;
        }
        .nodo-btn-secondary:hover { border-color: #94a3b8; color: #fff; }

        /* ═══ NETWORK CARDS (floating) ═══ */
        .nodo-network-card {
          position: absolute; z-index: 8; width: 180px; padding: 13px;
          border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;
          background: rgba(13,15,23,0.72); backdrop-filter: blur(16px);
          box-shadow: 0 15px 60px rgba(0,0,0,0.3); text-align: left;
          animation: nodo-card-float 6s ease-in-out infinite;
        }
        .nodo-card-camilo { left: 11%; top: 37%; animation-delay: 0s; }
        .nodo-card-health { right: 10%; top: 30%; animation-delay: 1s; }
        .nodo-card-match { right: 16%; bottom: 22%; width: 210px; animation-delay: 2s; }

        .nodo-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .nodo-card-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(6,182,212,0.2); border: 1px solid rgba(6,182,212,0.3);
          display: grid; place-items: center; font-size: 13px; font-weight: 700; color: #06b6d4;
        }
        .nodo-card-name { font-size: 13px; font-weight: 600; color: #fff; }
        .nodo-card-role { font-size: 11px; color: #94a3b8; }
        .nodo-card-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 2px; }
        .nodo-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
        .nodo-card-tags span {
          padding: 3px 8px; font-size: 11px; border-radius: 6px;
          background: rgba(6,182,212,0.1); color: #06b6d4; border: 1px solid rgba(6,182,212,0.2);
        }
        .nodo-card-avatars { display: flex; margin-top: 8px; }
        .nodo-mini-avatar { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #0d0f17; margin-left: -6px; }
        .nodo-mini-avatar:first-child { margin-left: 0; }
        .nodo-av-violet { background: #8b5cf6; }
        .nodo-av-cyan { background: #06b6d4; }
        .nodo-av-green { background: #34d399; }

        .nodo-match-row { display: flex; align-items: center; gap: 12px; }
        .nodo-match-icon {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3);
          display: grid; place-items: center; color: #34d399; font-size: 14px;
        }
        .nodo-match-score { font-size: 22px; font-weight: 700; color: #34d399; }
        .nodo-match-detail { font-size: 11px; color: #94a3b8; margin-top: 8px; }

        /* Hide cards on mobile */
        @media (max-width: 1023px) {
          .nodo-network-card { display: none; }
        }

        /* ═══ HERO STATUS BAR ═══ */
        .nodo-hero-status {
          position: absolute; bottom: 32px; left: 0; right: 0;
          display: flex; justify-content: center; gap: 24px;
          font-size: 12px; color: #94a3b8; z-index: 5;
        }
        .nodo-status-item { display: flex; align-items: center; gap: 8px; }
        .nodo-status-dot { width: 6px; height: 6px; border-radius: 50%; animation: nodo-pulse 2s ease-in-out infinite; }
        .nodo-dot-green { background: #34d399; }
        .nodo-dot-cyan { background: #06b6d4; }

        /* ═══ MARQUEE ═══ */
        .nodo-marquee-section {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 16px 0; overflow: hidden;
          background: rgba(13,15,23,0.5);
        }
        .nodo-marquee-track {
          display: flex; white-space: nowrap;
          animation: nodo-marquee 40s linear infinite;
        }
        .nodo-marquee-item {
          font-size: 14px; color: #475569; letter-spacing: 0.15em;
          text-transform: uppercase; margin: 0 24px; flex-shrink: 0;
        }

        /* ═══ SECTIONS ═══ */
        .nodo-section { padding: 96px 24px; }
        .nodo-section-border { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nodo-section-border-top { border-top: 1px solid rgba(255,255,255,0.06); }
        .nodo-container { max-width: 1280px; margin: 0 auto; }
        .nodo-text-center { text-align: center; }
        .nodo-mb-16 { margin-bottom: 64px; }
        .nodo-section-header { max-width: 640px; margin-bottom: 64px; }
        .nodo-section-title {
          font-size: clamp(28px, 4vw, 48px); font-weight: 700;
          color: #fff; margin-bottom: 24px; letter-spacing: -0.03em; line-height: 1.1;
        }
        .nodo-section-desc { color: #94a3b8; font-size: 16px; line-height: 1.6; max-width: 520px; }

        /* Problem Grid */
        .nodo-problem-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 768px) { .nodo-problem-grid { grid-template-columns: 1fr 1fr; } }
        .nodo-problem-card { border-radius: 12px; padding: 24px; }
        .nodo-problem-old { border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.03); }
        .nodo-problem-new { border: 1px solid rgba(6,182,212,0.2); background: rgba(6,182,212,0.03); }
        .nodo-problem-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .nodo-problem-icon {
          width: 32px; height: 32px; border-radius: 8px;
          display: grid; place-items: center; font-size: 14px;
        }
        .nodo-icon-red { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; }
        .nodo-icon-cyan { background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); color: #06b6d4; }
        .nodo-problem-label { font-size: 14px; font-weight: 500; }
        .nodo-label-red { color: rgba(239,68,68,0.8); }
        .nodo-label-cyan { color: rgba(6,182,212,0.8); }
        .nodo-problem-messages { display: flex; flex-direction: column; gap: 10px; }
        .nodo-problem-msg {
          padding: 8px 12px; border-radius: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          font-size: 12px; color: #94a3b8;
        }
        .nodo-problem-footer { font-size: 11px; color: #475569; margin-top: 16px; }
        .nodo-problem-matches { display: flex; flex-direction: column; gap: 12px; }
        .nodo-match-item {
          padding: 10px 12px; border-radius: 8px;
          background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.15);
        }
        .nodo-match-green { background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.15); }
        .nodo-match-item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .nodo-match-item-title { font-size: 12px; font-weight: 500; color: #fff; }
        .nodo-match-item-badge { font-size: 10px; color: #06b6d4; }
        .nodo-badge-green { color: #34d399; }
        .nodo-match-item-desc { font-size: 11px; color: #94a3b8; }

        /* ═══ STEPS ═══ */
        .nodo-steps-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 768px) { .nodo-steps-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .nodo-steps-grid { grid-template-columns: repeat(4, 1fr); } }
        .nodo-step-card {
          position: relative; overflow: hidden;
          background: rgba(13,15,23,0.6); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 24px; transition: border-color 0.2s;
        }
        .nodo-step-card:hover { border-color: rgba(6,182,212,0.3); }
        .nodo-step-number {
          position: absolute; top: -8px; right: -4px;
          font-size: 64px; font-weight: 900; color: rgba(255,255,255,0.03);
          line-height: 1; pointer-events: none; user-select: none;
        }
        .nodo-step-icon {
          width: 40px; height: 40px; border-radius: 8px;
          border: 1px solid rgba(6,182,212,0.3); background: rgba(6,182,212,0.05);
          display: grid; place-items: center; font-size: 18px; color: #06b6d4;
          margin-bottom: 16px;
        }
        .nodo-step-label { font-size: 12px; font-family: monospace; color: #06b6d4; font-weight: 700; }
        .nodo-step-title { font-size: 14px; font-weight: 700; color: #fff; margin: 8px 0; letter-spacing: 0.05em; }
        .nodo-step-desc { font-size: 14px; color: #94a3b8; margin-bottom: 16px; }
        .nodo-step-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .nodo-step-tag {
          padding: 3px 8px; font-size: 10px; border-radius: 999px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #64748b;
        }

        /* ═══ CTA ═══ */
        .nodo-cta-title {
          font-size: clamp(36px, 6vw, 64px); font-weight: 700;
          color: #fff; margin-bottom: 24px; letter-spacing: -0.04em;
        }
        .nodo-cta-desc { color: #94a3b8; margin-bottom: 40px; max-width: 420px; margin-left: auto; margin-right: auto; font-size: 16px; }

        /* ═══ FOOTER ═══ */
        .nodo-footer {
          border-top: 1px solid rgba(255,255,255,0.06); padding: 32px 24px;
        }
        .nodo-footer-inner { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #94a3b8; }
        .nodo-footer-status { display: flex; align-items: center; gap: 8px; }

        /* ═══ ANIMATIONS ═══ */
        @keyframes nodo-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes nodo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes nodo-card-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
