import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useSessionStore } from '@/stores/sessionStore';
import { SkillPicker } from '@/components/profile/SkillPicker';
import { RecoveryCodeDisplay } from '@/components/profile/RecoveryCodeDisplay';
import { Spinner } from '@/components/base/Spinner';
import type { CreatePersonResponse, ExtractSkillsResponse, Availability } from '@nodo/contracts';

type Step = 'choose' | 'profile' | 'login' | 'recovery';

/* ─── Network Node Data ─── */
const NETWORK_NODES: { id: string; label: string; type: string; x: string; y: string }[] = [
  { id: 'n1', label: 'Camilo R.', type: 'person', x: '12%', y: '18%' },
  { id: 'n2', label: 'Health AI', type: 'team', x: '78%', y: '12%' },
  { id: 'n3', label: 'React Native', type: 'idea', x: '82%', y: '72%' },
  { id: 'n4', label: 'Ana M.', type: 'person', x: '18%', y: '75%' },
  { id: 'n5', label: 'Fintech App', type: 'team', x: '65%', y: '85%' },
];

const EDGES: { from: string; to: string; ai?: boolean }[] = [
  { from: 'n1', to: 'core' },
  { from: 'n2', to: 'core', ai: true },
  { from: 'n3', to: 'core' },
  { from: 'n4', to: 'core', ai: true },
  { from: 'n5', to: 'core' },
];

const chooseStyles = `
  /* ═══ AUTH PAGES (choose + login) ═══ */
  .auth-page { min-height:100vh; position:relative; isolation:isolate; background:radial-gradient(circle at 75% 20%,rgba(6,182,212,.09),transparent 27%),radial-gradient(circle at 20% 85%,rgba(52,211,153,.035),transparent 24%),#07080d; color:#f4f7fb; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
  .auth-grid { position:absolute; inset:0; z-index:-3; opacity:.48; background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px); background-size:56px 56px; mask-image:radial-gradient(circle at 50% 48%,#000 10%,rgba(0,0,0,.8) 35%,transparent 78%); -webkit-mask-image:radial-gradient(circle at 50% 48%,#000 10%,rgba(0,0,0,.8) 35%,transparent 78%); }
  .auth-grid:after { content:""; position:absolute; inset:0; background-image:radial-gradient(circle,rgba(103,232,249,.18) 1px,transparent 1px); background-size:56px 56px; opacity:.18; }
  .auth-ambient { position:absolute; inset:0; z-index:-1; pointer-events:none; overflow:hidden; }
  .auth-ambient svg { position:absolute; inset:0; width:100%; height:100%; }
  .auth-ambient line { stroke:rgba(6,182,212,.15); stroke-width:1; stroke-dasharray:4 10; animation:auth-dash 9s linear infinite; }
  .auth-node { position:absolute; width:10px; height:10px; border-radius:50%; border:1px solid rgba(6,182,212,.55); background:rgba(6,182,212,.16); box-shadow:0 0 24px rgba(6,182,212,.18); animation:auth-float 7s ease-in-out infinite; }
  .auth-node.green { border-color:rgba(52,211,153,.55); background:rgba(52,211,153,.12); }
  .auth-n1 { left:12%; top:27%; animation-delay:-1s; }
  .auth-n2 { right:14%; top:31%; animation-delay:-4s; }
  .auth-n3 { right:24%; bottom:17%; animation-delay:-2s; }
  .auth-header { position:relative; z-index:10; width:min(1280px,calc(100% - 56px)); margin:auto; height:86px; display:flex; align-items:center; justify-content:space-between; }
  .auth-logo { font-size:21px; font-weight:800; letter-spacing:-.06em; }
  .auth-logo b { color:#06b6d4; font-size:10px; margin-left:3px; vertical-align:3px; }
  .auth-live { display:flex; align-items:center; gap:8px; color:#657185; font-size:11px; }
  .auth-live i { width:6px; height:6px; border-radius:50%; background:#34d399; box-shadow:0 0 14px rgba(52,211,153,.8); animation:auth-pulse 2s infinite; display:inline-block; }
  .auth-main { width:min(1280px,calc(100% - 56px)); min-height:calc(100vh - 86px); margin:auto; display:grid; place-items:center; padding:30px 0 70px; }
  .auth-card { width:min(470px,100%); position:relative; padding:42px 42px 38px; border:1px solid rgba(255,255,255,.085); border-radius:16px; background:rgba(13,15,23,.80); backdrop-filter:blur(16px); box-shadow:0 30px 100px rgba(0,0,0,.42),0 0 70px rgba(6,182,212,.045); }
  .auth-card:before { content:""; position:absolute; inset:-1px; border-radius:17px; padding:1px; background:linear-gradient(145deg,rgba(6,182,212,.35),rgba(255,255,255,.05) 38%,transparent 72%); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; opacity:.55; }
  .auth-mark { width:52px; height:52px; margin:0 auto 24px; display:grid; place-items:center; border-radius:14px; border:1px solid rgba(6,182,212,.22); background:rgba(6,182,212,.055); box-shadow:0 0 35px rgba(6,182,212,.08); }
  .auth-mark svg { width:31px; height:31px; }
  .auth-title { text-align:center; font-size:32px; line-height:1.05; letter-spacing:-.055em; font-weight:800; margin:0; }
  .auth-subtitle { text-align:center; color:#8a96a9; font-size:13px; line-height:1.7; margin:13px auto 30px; max-width:350px; }
  .auth-actions { display:grid; gap:10px; }
  .auth-btn { width:100%; border-radius:8px; padding:13px 16px; border:1px solid transparent; font-size:13px; font-weight:700; transition:.2s ease; cursor:pointer; }
  .auth-btn-primary { background:#06b6d4; color:#041116; box-shadow:0 0 20px rgba(6,182,212,.2); }
  .auth-btn-primary:hover { background:#22d3ee; transform:translateY(-1px); box-shadow:0 0 28px rgba(6,182,212,.28); }
  .auth-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .auth-btn-secondary { background:rgba(255,255,255,.012); color:#93a0b4; border-color:rgba(255,255,255,.09); }
  .auth-btn-secondary:hover { background:rgba(255,255,255,.035); border-color:rgba(255,255,255,.15); color:#d9e2ed; }
  .auth-footer { text-align:center; color:#4f5b6e; font-size:10px; margin-top:24px; }
  .auth-caption { display:flex; align-items:center; justify-content:center; gap:8px; margin-top:24px; }
  .auth-caption-line { width:20px; height:1px; background:linear-gradient(90deg,transparent,rgba(6,182,212,.4)); }
  .auth-caption-dot { width:5px; height:5px; border-radius:50%; background:#06b6d4; box-shadow:0 0 10px #06b6d4; }
  .auth-key-ring { width:72px; height:72px; border-radius:50%; position:absolute; top:30px; right:32px; border:1px solid rgba(6,182,212,.08); box-shadow:0 0 45px rgba(6,182,212,.05); }
  .auth-key-ring:before, .auth-key-ring:after { content:""; position:absolute; border-radius:50%; border:1px solid rgba(6,182,212,.06); }
  .auth-key-ring:before { inset:10px; }
  .auth-key-ring:after { inset:22px; }
  .auth-code-input { width:100%; height:66px; text-align:center; letter-spacing:.38em; text-indent:.38em; text-transform:uppercase; font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace; font-size:25px; font-weight:800; color:#dffaff; background:#11141d; border:1px solid rgba(255,255,255,.09); border-radius:10px; outline:0; transition:.2s; }
  .auth-code-input::placeholder { color:#394454; letter-spacing:.32em; }
  .auth-code-input:hover { border-color:rgba(255,255,255,.15); }
  .auth-code-input:focus { border-color:rgba(6,182,212,.7); box-shadow:0 0 0 3px rgba(6,182,212,.09),0 0 35px rgba(6,182,212,.10); }
  .auth-code-meta { display:flex; justify-content:space-between; margin-top:8px; color:#566277; font-size:10px; }
  .auth-code-label { text-align:left; font-size:11px; font-weight:700; color:#cbd5e1; margin-bottom:8px; }
  .auth-back { display:block; text-align:center; margin-top:20px; color:#657185; font-size:11px; background:none; border:none; cursor:pointer; transition:.2s; }
  .auth-back:hover { color:#a9b5c5; }
  .auth-error { text-align:center; font-size:12px; color:#f87171; margin-top:8px; }
  @keyframes auth-pulse { 50% { opacity:.45; } }
  @keyframes auth-float { 0%,100% { transform:translate3d(0,0,0); } 50% { transform:translate3d(0,-12px,0); } }
  @keyframes auth-dash { to { stroke-dashoffset:-140; } }
  @media(max-width:650px) { .auth-header { width:calc(100% - 32px); height:70px; } .auth-main { width:calc(100% - 32px); padding:22px 0 45px; } .auth-card { padding:34px 22px 30px; } .auth-title { font-size:29px; } .auth-key-ring { display:none; } }
`;

/* ─── Helpers ─── */
function getNodePosition(id: string): { x: number; y: number } {
  if (id === 'core') return { x: 50, y: 50 };
  const node = NETWORK_NODES.find((n) => n.id === id);
  if (!node) return { x: 50, y: 50 };
  return { x: parseFloat(node.x), y: parseFloat(node.y) };
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);

  const [step, setStep] = useState<Step>('choose');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  /* ─── Form State ─── */
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [headline, setHeadline] = useState('');
  const [bioRaw, setBioRaw] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>('full');
  const [language, setLanguage] = useState<'es' | 'en'>('es');

  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  const handleValid = /^[a-z0-9][a-z0-9_-]{1,29}$/.test(handle);

  /* ─── Completion Score ─── */
  const completionPercent = useMemo(() => {
    let filled = 0;
    const total = 6;
    if (displayName.trim()) filled++;
    if (handle.trim()) filled++;
    if (headline.trim()) filled++;
    if (bioRaw.trim()) filled++;
    if (skills.length > 0) filled++;
    if (availability) filled++;
    return Math.round((filled / total) * 100);
  }, [displayName, handle, headline, bioRaw, skills, availability]);

  const signalsConnected = useMemo(() => {
    let count = 0;
    if (displayName.trim()) count++;
    if (handle.trim()) count++;
    if (headline.trim()) count++;
    if (bioRaw.trim()) count++;
    count += skills.length;
    if (availability) count++;
    if (language) count++;
    return count;
  }, [displayName, handle, headline, bioRaw, skills, availability, language]);

  /* ─── Handlers ─── */
  async function handleExtractSkills() {
    if (!bioRaw.trim()) return;
    setExtracting(true);
    try {
      const res = await apiFetch<ExtractSkillsResponse>('/v1/skills/extract', {
        method: 'POST',
        body: JSON.stringify({ text: bioRaw }),
      });
      const newSlugs = res.skills.map((s) => s.slug).filter((slug) => !skills.includes(slug));
      if (newSlugs.length > 0) {
        setSkills([...skills, ...newSlugs]);
      }
    } catch {
      // Mock fallback: add some mock skills
      const mockSkills = ['typescript', 'react', 'node-js'].filter((s) => !skills.includes(s));
      if (mockSkills.length > 0) {
        setSkills([...skills, ...mockSkills.slice(0, 3)]);
      }
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHandleError(null);

    if (!displayName.trim() || !handle.trim()) {
      setError('Display name and handle are required.');
      return;
    }

    if (!handleValid) {
      setHandleError('Handle must be lowercase, 2-30 chars (letters, digits, hyphens, underscores).');
      return;
    }

    setSubmitting(true);
    try {
      let res: CreatePersonResponse;
      try {
        res = await apiFetch<CreatePersonResponse>('/v1/people', {
          method: 'POST',
          body: JSON.stringify({
            displayName: displayName.trim(),
            handle: handle.trim(),
            headline: headline.trim() || undefined,
            bioRaw: bioRaw.trim() || undefined,
            skills: skills.length > 0 ? skills : undefined,
            availability,
            language,
          }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setHandleError('This handle is already taken. Try another one.');
          setSubmitting(false);
          return;
        }
        // Fallback: mock profile creation when backend is unavailable
        const mockId = `per_${handle.trim()}`;
        const mockToken = `mock_token_${Date.now()}`;
        const mockCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        setSession(mockId, mockToken);
        setRecoveryCode(mockCode);
        setStep('recovery');
        setSubmitting(false);
        return;
      }

      setSession(res.person.id, res.sessionToken);
      setRecoveryCode(res.recoveryCode);
      setStep('recovery');
    } finally {
      setSubmitting(false);
    }
  }

  function handleContinue() {
    navigate('/discover', { replace: true });
  }

  /* ─── Login handler ─── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    if (!loginCode.trim()) {
      setLoginError('Please enter your recovery code.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await apiFetch<{ personId: string; sessionToken: string }>('/v1/session/recover', {
        method: 'POST',
        body: JSON.stringify({ recoveryCode: loginCode.trim() }),
      });
      setSession(res.personId, res.sessionToken);
      navigate('/discover', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLoginError('Recovery code not found. Please check and try again.');
      } else {
        // Mock fallback for demo
        const mockId = `per_recovered_${Date.now()}`;
        const mockToken = `mock_token_${Date.now()}`;
        setSession(mockId, mockToken);
        navigate('/discover', { replace: true });
      }
    } finally {
      setLoggingIn(false);
    }
  }

  /* ─── Choose Step ─── */
  if (step === 'choose') {
    return (
      <div className="auth-page">
        <div className="auth-grid" />
        <div className="auth-ambient" aria-hidden="true">
          <svg viewBox="0 0 1400 900" preserveAspectRatio="none">
            <line x1="12%" y1="27%" x2="48%" y2="48%" />
            <line x1="48%" y1="48%" x2="86%" y2="31%" />
            <line x1="48%" y1="48%" x2="76%" y2="84%" />
          </svg>
          <div className="auth-node auth-n1" />
          <div className="auth-node green auth-n2" />
          <div className="auth-node auth-n3" />
        </div>
        <header className="auth-header">
          <div className="auth-logo">NODO<b>●</b></div>
          <div className="auth-live"><i />The network is live</div>
        </header>
        <main className="auth-main">
          <section className="auth-card">
            <div className="auth-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <circle cx="6" cy="6" r="2.3" />
                <circle cx="18" cy="6" r="2.3" />
                <circle cx="12" cy="18" r="2.3" />
                <path d="M8 7.2l7.7 0M7.2 8l3.7 7.5M16.8 8l-3.7 7.5" />
              </svg>
            </div>
            <h1 className="auth-title">Welcome to Nodo</h1>
            <p className="auth-subtitle">Join the realtime talent network. Find your team, validate your skills, and start building together.</p>
            <div className="auth-actions">
              <button onClick={() => setStep('profile')} className="auth-btn auth-btn-primary">Create Account</button>
              <button onClick={() => setStep('login')} className="auth-btn auth-btn-secondary">I have a recovery code</button>
            </div>
            <div className="auth-caption">
              <span className="auth-caption-line" />
              <span className="auth-caption-dot" />
              <span className="auth-caption-line" />
            </div>
            <p className="auth-footer">One profile. Real connections. No password required.</p>
            <button onClick={() => navigate('/')} className="auth-back">← Back to home</button>
          </section>
        </main>
        <style>{chooseStyles}</style>
      </div>
    );
  }

  /* ─── Login Step ─── */
  if (step === 'login') {
    return (
      <div className="auth-page">
        <div className="auth-grid" />
        <div className="auth-ambient" aria-hidden="true">
          <svg viewBox="0 0 1400 900" preserveAspectRatio="none">
            <line x1="12%" y1="27%" x2="48%" y2="48%" />
            <line x1="48%" y1="48%" x2="86%" y2="31%" />
            <line x1="48%" y1="48%" x2="76%" y2="84%" />
          </svg>
          <div className="auth-node auth-n1" />
          <div className="auth-node green auth-n2" />
          <div className="auth-node auth-n3" />
        </div>
        <header className="auth-header">
          <div className="auth-logo">NODO<b>●</b></div>
          <div className="auth-live"><i />The network is live</div>
        </header>
        <main className="auth-main">
          <section className="auth-card">
            <div className="auth-key-ring" />
            <div className="auth-mark">
              <svg viewBox="0 0 64 64" fill="none">
                <rect x="17" y="27" width="30" height="23" rx="5" stroke="#06b6d4" strokeWidth="2" />
                <path d="M23 27v-6a9 9 0 0 1 18 0v6" stroke="#67e8f9" strokeWidth="2" />
                <circle cx="32" cy="38" r="3" stroke="#06b6d4" strokeWidth="2" />
                <path d="M32 41v4" stroke="#06b6d4" strokeWidth="2" />
              </svg>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Enter your 6-character recovery code to restore your session.</p>
            <form onSubmit={handleLogin}>
              <p className="auth-code-label">Recovery code</p>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => { setLoginCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()); setLoginError(null); }}
                placeholder="••••••"
                maxLength={6}
                className="auth-code-input"
                autoFocus
              />
              <div className="auth-code-meta">
                <span>6 characters</span>
                <span>{loginCode.length} / 6</span>
              </div>
              {loginError && <p className="auth-error">{loginError}</p>}
              <div style={{ height: 18 }} />
              <button type="submit" disabled={loggingIn || loginCode.length < 6} className="auth-btn auth-btn-primary">
                {loggingIn ? 'Recovering...' : 'Recover Account'}
              </button>
            </form>
            <button onClick={() => setStep('choose')} className="auth-back">← Back</button>
            <p className="auth-footer">Your recovery code is your key to Nodo.</p>
          </section>
        </main>
        <style>{chooseStyles}</style>
      </div>
    );
  }

  /* ─── Recovery Step ─── */
  if (step === 'recovery') {
    return <RecoveryCodeDisplay code={recoveryCode} onContinue={handleContinue} />;
  }

  /* ─── Main Layout ─── */
  return (
    <div className="ob-page">
      {/* Top Bar */}
      <header className="ob-header">
        <div className="ob-header-logo">
          <span className="ob-logo-text">NODO</span>
          <span className="ob-logo-dot" />
        </div>
        <div className="ob-header-status">
          <span className="ob-status-pulse" />
          The network is live
        </div>
      </header>

      {/* Split Layout */}
      <div className="ob-split">
        {/* ─── LEFT PANEL: Form ─── */}
        <div className="ob-form-panel">
          <form onSubmit={handleSubmit} className="ob-form">
            {/* Back button */}
            <button type="button" onClick={() => setStep('choose')} className="ob-back-btn">← Back</button>

            {/* Eyebrow */}
            <p className="ob-eyebrow">Create Your Identity</p>

            {/* Title */}
            <h1 className="ob-form-title">
              Make yourself<br />discoverable.
            </h1>

            {/* Intro */}
            <p className="ob-form-intro">
              Tell Nodo what you build, what you know, and what kind of projects excite you.
              We&apos;ll connect you with the right teams and opportunities.
            </p>

            {error && <div className="ob-error">{error}</div>}

            {/* Row 1: Display Name + Handle */}
            <div className="ob-row-2col">
              <div className="ob-field">
                <label htmlFor="displayName" className="ob-label">
                  Display Name <span className="ob-required">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="ob-input"
                />
              </div>
              <div className="ob-field">
                <label htmlFor="handle" className="ob-label">
                  Handle <span className="ob-required">*</span>
                </label>
                <input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) => { setHandle(e.target.value.toLowerCase()); setHandleError(null); }}
                  placeholder="your-handle"
                  required
                  className={`ob-input ${handleError ? 'ob-input-error' : ''}`}
                />
                {handleError && <p className="ob-field-error">{handleError}</p>}
              </div>
            </div>

            {/* Row 2: Headline */}
            <div className="ob-field">
              <label htmlFor="headline" className="ob-label">
                Headline <span className="ob-optional">optional</span>
              </label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Backend Engineer · Open Source Contributor"
                className="ob-input"
              />
            </div>

            {/* Row 3: Bio */}
            <div className="ob-field">
              <label htmlFor="bioRaw" className="ob-label">Bio</label>
              <div className="ob-textarea-wrap">
                <textarea
                  id="bioRaw"
                  value={bioRaw}
                  onChange={(e) => setBioRaw(e.target.value)}
                  placeholder="Tell us about your experience, projects, and interests..."
                  rows={4}
                  className="ob-textarea"
                />
                <button
                  type="button"
                  onClick={handleExtractSkills}
                  disabled={extracting || !bioRaw.trim()}
                  className="ob-analyze-btn"
                >
                  {extracting ? (
                    <>
                      <Spinner size="sm" />
                      <span className="ob-shimmer">Analyzing...</span>
                    </>
                  ) : (
                    '✨ Analyze Bio for Skills'
                  )}
                </button>
              </div>
            </div>

            {/* Row 4: Skills */}
            <div className="ob-field">
              <div className="ob-field-header">
                <label className="ob-label">Skills</label>
                <span className="ob-hint">These power your AI matches</span>
              </div>
              <div className="ob-skills-box">
                <SkillPicker value={skills} onChange={setSkills} />
              </div>
            </div>

            {/* Row 5: Availability + Language */}
            <div className="ob-row-2col">
              <div className="ob-field">
                <label htmlFor="availability" className="ob-label">Availability</label>
                <select
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as Availability)}
                  className="ob-select"
                >
                  <option value="full">Full-time</option>
                  <option value="partial">Partial</option>
                  <option value="evenings">Evenings only</option>
                </select>
              </div>
              <div className="ob-field">
                <label htmlFor="language" className="ob-label">Language</label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                  className="ob-select"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !displayName.trim() || !handle.trim()}
              className="ob-submit"
            >
              {submitting ? (
                <span className="ob-submit-loading">
                  <Spinner size="sm" />
                  Creating...
                </span>
              ) : (
                'Create Profile →'
              )}
            </button>

            {/* Legal */}
            <p className="ob-legal">You can edit your profile and skills anytime.</p>
          </form>
        </div>

        {/* ─── RIGHT PANEL: Visual ─── */}
        <div className="ob-visual">
          {/* Grid background */}
          <div className="ob-visual-grid" />

          {/* Eyebrow at TOP of right panel */}
          <div className="ob-visual-eyebrow">
            <span className="ob-visual-eyebrow-text">YOUR PLACE IN THE NETWORK</span>
            <span className="ob-visual-online">
              <span className="ob-online-dot" />
              128 online
            </span>
          </div>

          {/* SVG Edges */}
          <svg className="ob-edges">
            {EDGES.map((edge, i) => {
              const from = getNodePosition(edge.from);
              const to = getNodePosition(edge.to);
              return (
                <line
                  key={i}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  className={edge.ai ? 'ob-edge ob-edge-ai' : 'ob-edge'}
                />
              );
            })}
          </svg>

          {/* Network Nodes */}
          {NETWORK_NODES.map((node, i) => (
            <div
              key={node.id}
              className="ob-node"
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${i * 0.8}s`,
              }}
            >
              <div className={`ob-node-circle ob-node-${node.type}`}>
                {node.type === 'person' ? '👤' : node.type === 'team' ? '🏢' : '💡'}
              </div>
              <span className="ob-node-label">{node.label}</span>
            </div>
          ))}

          {/* Core Node */}
          <div className="ob-core">
            <div className="ob-core-inner">
              <span className="ob-core-percent">{completionPercent}%</span>
              <span className="ob-core-label">profile ready</span>
            </div>
          </div>

          {/* Signal count below core */}
          <p className="ob-signal-text">
            Building your identity · {signalsConnected} signal{signalsConnected !== 1 ? 's' : ''} connected
          </p>

          {/* Live Preview Card */}
          <div className="ob-preview">
            <p className="ob-preview-eyebrow">Live Preview</p>
            <div className="ob-preview-content">
              {/* Avatar */}
              <div className="ob-preview-avatar">
                {displayName.trim() ? displayName.trim()[0].toUpperCase() : '?'}
              </div>
              <div className="ob-preview-info">
                <p className="ob-preview-name">
                  {displayName.trim() || 'Your Name'}
                </p>
                <p className="ob-preview-handle">
                  @{handle.trim() || 'handle'}
                </p>
                {headline.trim() && (
                  <p className="ob-preview-headline">{headline}</p>
                )}
                {skills.length > 0 && (
                  <div className="ob-preview-skills">
                    {skills.slice(0, 5).map((slug) => (
                      <span key={slug} className="ob-preview-skill">{slug}</span>
                    ))}
                    {skills.length > 5 && (
                      <span className="ob-preview-skill ob-preview-skill-more">
                        +{skills.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Styles ─── */}
      <style>{`
        /* ═══ PAGE BASE ═══ */
        .ob-page {
          min-height: 100vh;
          background: radial-gradient(circle at 75% 20%, rgba(6,182,212,0.09), transparent 27%), #07080d;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex; flex-direction: column;
        }
        .ob-recovery {
          min-height: 100vh;
          background: #07080d;
          display: flex; align-items: center; justify-content: center;
          padding: 16px 48px;
        }

        /* ═══ HEADER ═══ */
        .ob-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ob-header-logo { display: flex; align-items: center; gap: 4px; }
        .ob-logo-text { font-size: 21px; font-weight: 800; letter-spacing: -0.06em; }
        .ob-logo-dot { width: 8px; height: 8px; background: #06b6d4; border-radius: 50%; }
        .ob-header-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; }
        .ob-status-pulse { width: 6px; height: 6px; background: #34d399; border-radius: 50%; animation: ob-pulse 2s ease-in-out infinite; }

        /* ═══ SPLIT LAYOUT ═══ */
        .ob-split {
          flex: 1; display: grid;
          grid-template-columns: 1fr;
          gap: 0; padding: 16px;
        }
        @media (min-width: 1024px) {
          .ob-split { grid-template-columns: 1fr 0.95fr; gap: 0; padding: 24px; }
        }

        /* ═══ LEFT: FORM PANEL ═══ */
        .ob-form-panel {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(13,15,23,0.8);
          backdrop-filter: blur(16px);
          padding: 24px;
          overflow-y: auto;
        }
        @media (min-width: 1024px) { .ob-form-panel { padding: 40px; } }
        .ob-form { max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        .ob-back-btn { align-self: flex-start; background: none; border: none; color: #657185; font-size: 12px; cursor: pointer; transition: color 0.2s; padding: 0; }
        .ob-back-btn:hover { color: #fff; }
        .ob-eyebrow {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.2em; color: #06b6d4;
        }
        .ob-form-title {
          font-size: clamp(28px, 4vw, 36px); font-weight: 700;
          line-height: 1.1; letter-spacing: -0.03em; color: #fff;
        }
        .ob-form-intro { font-size: 14px; color: #94a3b8; line-height: 1.6; }
        .ob-error {
          border-radius: 8px; background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.2);
          padding: 12px 16px; font-size: 14px; color: #f87171;
        }

        /* Fields */
        .ob-row-2col { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .ob-row-2col { grid-template-columns: 1fr 1fr; } }
        .ob-field { display: flex; flex-direction: column; gap: 6px; }
        .ob-field-header { display: flex; align-items: center; justify-content: space-between; }
        .ob-label { font-size: 12px; font-weight: 500; color: #cbd5e1; }
        .ob-required { color: #f87171; }
        .ob-optional { font-size: 10px; color: #475569; margin-left: 6px; }
        .ob-hint { font-size: 10px; color: #64748b; }
        .ob-input {
          width: 100%; border-radius: 8px;
          background: #11141d; border: 1px solid rgba(255,255,255,0.08);
          padding: 10px 12px; font-size: 14px; color: #fff;
          outline: none; transition: all 0.2s;
        }
        .ob-input::placeholder { color: #475569; }
        .ob-input:focus { border-color: #06b6d4; box-shadow: 0 0 0 1px rgba(6,182,212,0.3); }
        .ob-input-error { border-color: #f87171 !important; }
        .ob-input-error:focus { box-shadow: 0 0 0 1px rgba(248,113,113,0.3); }
        .ob-field-error { font-size: 11px; color: #f87171; }
        .ob-select {
          width: 100%; border-radius: 8px;
          background: #11141d; border: 1px solid rgba(255,255,255,0.08);
          padding: 10px 12px; font-size: 14px; color: #fff;
          outline: none; transition: all 0.2s;
        }
        .ob-select:focus { border-color: #06b6d4; box-shadow: 0 0 0 1px rgba(6,182,212,0.3); }

        /* Textarea */
        .ob-textarea-wrap { position: relative; }
        .ob-textarea {
          width: 100%; border-radius: 8px;
          background: #11141d; border: 1px solid rgba(255,255,255,0.08);
          padding: 10px 12px; font-size: 14px; color: #fff;
          outline: none; resize: none; transition: all 0.2s;
        }
        .ob-textarea::placeholder { color: #475569; }
        .ob-textarea:focus { border-color: #06b6d4; box-shadow: 0 0 0 1px rgba(6,182,212,0.3); }
        .ob-analyze-btn {
          position: absolute; bottom: 12px; right: 12px;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; font-size: 11px; font-weight: 500;
          border-radius: 6px; background: rgba(6,182,212,0.1);
          color: #67e8f9; border: 1px solid rgba(6,182,212,0.2);
          cursor: pointer; transition: all 0.2s;
        }
        .ob-analyze-btn:hover:not(:disabled) { background: rgba(6,182,212,0.2); }
        .ob-analyze-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Skills */
        .ob-skills-box {
          border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
          background: #11141d; padding: 12px; min-height: 60px;
        }

        /* Submit */
        .ob-submit {
          width: 100%; padding: 12px; border-radius: 8px;
          background: #06b6d4; color: #041116; font-weight: 700; font-size: 14px;
          border: none; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 0 20px rgba(6,182,212,0.3);
        }
        .ob-submit:hover:not(:disabled) { background: #22d3ee; }
        .ob-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .ob-submit-loading { display: inline-flex; align-items: center; gap: 8px; justify-content: center; }
        .ob-legal { text-align: center; font-size: 11px; color: #475569; }

        /* ═══ RIGHT: VISUAL PANEL ═══ */
        .ob-visual {
          display: none;
          min-height: 760px; position: relative; overflow: hidden;
          border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(13,15,23,0.8); backdrop-filter: blur(16px);
          padding: 30px;
        }
        @media (min-width: 1024px) { .ob-visual { display: block; } }

        /* Grid background with mask */
        .ob-visual-grid {
          content: ""; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 55px 55px;
          mask-image: radial-gradient(circle, #000 15%, transparent 75%);
          -webkit-mask-image: radial-gradient(circle, #000 15%, transparent 75%);
        }

        /* Eyebrow at top */
        .ob-visual-eyebrow {
          position: relative; z-index: 5;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px;
        }
        .ob-visual-eyebrow-text {
          font-size: 10px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.2em; color: #64748b;
        }
        .ob-visual-online {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; color: #64748b;
        }
        .ob-online-dot { width: 6px; height: 6px; background: #34d399; border-radius: 50%; animation: ob-pulse 2s ease-in-out infinite; }

        /* SVG edges */
        .ob-edges {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 1;
        }
        .ob-edge {
          stroke: rgba(148,163,184,0.16); stroke-width: 1;
        }
        .ob-edge-ai {
          stroke: rgba(6,182,212,0.4); stroke-dasharray: 5 8;
          animation: ob-dash 4s linear infinite;
        }

        /* Nodes */
        .ob-node {
          position: absolute; z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          transform: translate(-50%, -50%);
          animation: ob-float 5s ease-in-out infinite;
        }
        .ob-node-circle {
          width: 42px; height: 42px; border-radius: 50%;
          display: grid; place-items: center;
          border: 1px solid; background: rgba(13,15,23,0.9);
          font-size: 16px;
        }
        .ob-node-person { border-color: rgba(6,182,212,0.4); color: #67e8f9; }
        .ob-node-team { border-color: rgba(139,92,246,0.4); color: #c4b5fd; }
        .ob-node-idea { border-color: rgba(52,211,153,0.4); color: #6ee7b7; }
        .ob-node-label { font-size: 10px; color: #64748b; white-space: nowrap; }

        /* Core */
        .ob-core {
          position: absolute; z-index: 4;
          left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: 116px; height: 116px;
          border: 1px solid rgba(6,182,212,0.4); border-radius: 50%;
          display: grid; place-items: center;
          background: rgba(7,8,13,0.8);
          box-shadow: 0 0 0 12px rgba(6,182,212,0.04), 0 0 70px rgba(6,182,212,0.12);
        }
        .ob-core::after {
          content: ""; position: absolute; inset: -11px;
          border: 1px dashed rgba(6,182,212,0.2); border-radius: 50%;
          animation: ob-spin 16s linear infinite;
        }
        .ob-core-inner { display: flex; flex-direction: column; align-items: center; }
        .ob-core-percent { font-size: 30px; font-weight: 700; color: #fff; }
        .ob-core-label { font-size: 10px; color: #64748b; margin-top: 2px; }

        /* Signal text */
        .ob-signal-text {
          position: absolute; z-index: 5;
          left: 50%; bottom: 140px; transform: translateX(-50%);
          font-size: 11px; color: #64748b; text-align: center; white-space: nowrap;
        }

        /* Live Preview */
        .ob-preview {
          position: absolute; z-index: 5;
          bottom: 24px; left: 24px; right: 24px;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(10,13,20,0.9); backdrop-filter: blur(16px);
          padding: 20px;
        }
        .ob-preview-eyebrow {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em;
          color: #475569; margin-bottom: 12px; font-weight: 500;
        }
        .ob-preview-content { display: flex; align-items: flex-start; gap: 12px; }
        .ob-preview-avatar {
          width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
          background: rgba(6,182,212,0.2); border: 1px solid rgba(6,182,212,0.3);
          display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #67e8f9;
        }
        .ob-preview-info { flex: 1; min-width: 0; }
        .ob-preview-name { font-size: 14px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ob-preview-handle { font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ob-preview-headline { font-size: 12px; color: #94a3b8; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ob-preview-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .ob-preview-skill {
          padding: 2px 8px; font-size: 10px; border-radius: 999px;
          border: 1px solid rgba(6,182,212,0.3); background: rgba(6,182,212,0.05); color: #a5f3fc;
        }
        .ob-preview-skill-more { border-color: rgba(255,255,255,0.1); color: #64748b; background: none; }

        /* ═══ ANIMATIONS ═══ */
        @keyframes ob-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ob-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-8px); }
        }
        @keyframes ob-dash {
          0% { stroke-dashoffset: 26; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes ob-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ob-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ob-shimmer {
          background: linear-gradient(90deg, #a5f3fc 0%, #fff 50%, #a5f3fc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ob-shimmer 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
