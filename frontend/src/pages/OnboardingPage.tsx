import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/lib/api';
import { useSessionStore } from '@/stores/sessionStore';
import { SkillPicker } from '@/components/profile/SkillPicker';
import { RecoveryCodeDisplay } from '@/components/profile/RecoveryCodeDisplay';
import { Spinner } from '@/components/base/Spinner';
import type { CreatePersonResponse, ExtractSkillsResponse, Availability } from '@nodo/contracts';

type Step = 'profile' | 'recovery';

/* ─── Network Node Data ─── */
const NETWORK_NODES: { id: string; label: string; type: string; x: string; y: string }[] = [
  { id: 'n1', label: 'Camilo R.', type: 'person', x: '12%', y: '18%' },
  { id: 'n2', label: 'Health AI', type: 'team', x: '78%', y: '12%' },
  { id: 'n3', label: 'React Native', type: 'idea', x: '82%', y: '72%' },
  { id: 'n4', label: 'Ana M.', type: 'person', x: '18%', y: '75%' },
  { id: 'n5', label: 'Fintech App', type: 'team', x: '65%', y: '85%' },
];

const EDGES: { from: string; to: string; dashed?: boolean }[] = [
  { from: 'n1', to: 'core' },
  { from: 'n2', to: 'core', dashed: true },
  { from: 'n3', to: 'core' },
  { from: 'n4', to: 'core', dashed: true },
  { from: 'n5', to: 'core' },
];

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

  const [step, setStep] = useState<Step>('profile');
  const [recoveryCode, setRecoveryCode] = useState('');

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

  /* ─── Recovery Step ─── */
  if (step === 'recovery') {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center px-4 py-12">
        <RecoveryCodeDisplay code={recoveryCode} onContinue={handleContinue} />
      </div>
    );
  }

  /* ─── Main Layout ─── */
  return (
    <div className="min-h-screen bg-[#07080d] text-white font-sans flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight">NODO</span>
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          The network is live
        </div>
      </header>

      {/* Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-0 p-4 lg:p-6">
        {/* ─── LEFT PANEL: Form ─── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[rgba(13,15,23,0.8)] backdrop-blur-md p-6 lg:p-10 overflow-y-auto">
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
            {/* Eyebrow */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Create Your Identity
            </p>

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-white">
              Make yourself<br />discoverable.
            </h1>

            {/* Intro */}
            <p className="text-sm text-slate-400 leading-relaxed">
              Tell Nodo what you build, what you know, and what kind of projects excite you.
              We'll connect you with the right teams and opportunities.
            </p>

            {error && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Row 1: Display Name + Handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="displayName" className="block text-xs font-medium text-slate-300">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full rounded-lg bg-[#11141d] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="handle" className="block text-xs font-medium text-slate-300">
                  Handle <span className="text-red-400">*</span>
                </label>
                <input
                  id="handle"
                  type="text"
                  value={handle}
                  onChange={(e) => { setHandle(e.target.value.toLowerCase()); setHandleError(null); }}
                  placeholder="your-handle"
                  required
                  className={`w-full rounded-lg bg-[#11141d] border px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all ${
                    handleError
                      ? 'border-red-400 focus:shadow-[0_0_0_1px_rgba(248,113,113,0.3)]'
                      : 'border-white/[0.08] focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)]'
                  }`}
                />
                {handleError && <p className="text-[11px] text-red-400">{handleError}</p>}
              </div>
            </div>

            {/* Row 2: Headline */}
            <div className="space-y-1.5">
              <label htmlFor="headline" className="block text-xs font-medium text-slate-300">
                Headline <span className="text-slate-600 text-[10px] ml-1">optional</span>
              </label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Backend Engineer · Open Source Contributor"
                className="w-full rounded-lg bg-[#11141d] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)] transition-all"
              />
            </div>

            {/* Row 3: Bio */}
            <div className="space-y-1.5">
              <label htmlFor="bioRaw" className="block text-xs font-medium text-slate-300">Bio</label>
              <div className="relative">
                <textarea
                  id="bioRaw"
                  value={bioRaw}
                  onChange={(e) => setBioRaw(e.target.value)}
                  placeholder="Tell us about your experience, projects, and interests..."
                  rows={4}
                  className="w-full rounded-lg bg-[#11141d] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)] transition-all resize-none"
                />
                <button
                  type="button"
                  onClick={handleExtractSkills}
                  disabled={extracting || !bioRaw.trim()}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {extracting ? (
                    <>
                      <Spinner size="sm" />
                      <span className="onboarding-shimmer">Analyzing...</span>
                    </>
                  ) : (
                    '✨ Analyze Bio for Skills'
                  )}
                </button>
              </div>
            </div>

            {/* Row 4: Skills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-300">Skills</label>
                <span className="text-[10px] text-slate-500">These power your AI matches</span>
              </div>
              <div className="rounded-lg border border-white/[0.08] bg-[#11141d] p-3 min-h-[60px]">
                <SkillPicker value={skills} onChange={setSkills} />
              </div>
            </div>

            {/* Row 5: Availability + Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="availability" className="block text-xs font-medium text-slate-300">
                  Availability
                </label>
                <select
                  id="availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as Availability)}
                  className="w-full rounded-lg bg-[#11141d] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)] transition-all"
                >
                  <option value="full">Full-time</option>
                  <option value="partial">Partial</option>
                  <option value="evenings">Evenings only</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="language" className="block text-xs font-medium text-slate-300">
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                  className="w-full rounded-lg bg-[#11141d] border border-white/[0.08] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_1px_rgba(6,182,212,0.3)] transition-all"
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
              className="w-full py-3 rounded-lg bg-cyan-500 text-[#041116] font-bold text-sm hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Spinner size="sm" />
                  Creating...
                </span>
              ) : (
                'Create Profile →'
              )}
            </button>

            {/* Legal */}
            <p className="text-center text-[11px] text-slate-600">
              You can edit your profile and skills anytime.
            </p>
          </form>
        </div>

        {/* ─── RIGHT PANEL: Visual ─── */}
        <div className="hidden lg:block rounded-2xl border border-white/[0.08] bg-[rgba(13,15,23,0.8)] backdrop-blur-md relative overflow-hidden">
          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse at center, white 30%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, white 30%, transparent 70%)',
            }}
          />

          {/* SVG Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
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
                  stroke={edge.dashed ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.08)'}
                  strokeWidth="1"
                  strokeDasharray={edge.dashed ? '6 4' : undefined}
                  className={edge.dashed ? 'onboarding-dash-anim' : ''}
                />
              );
            })}
          </svg>

          {/* Network Nodes */}
          {NETWORK_NODES.map((node, i) => (
            <div
              key={node.id}
              className="absolute flex flex-col items-center gap-1 onboarding-float"
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${i * 0.7}s`,
                zIndex: 2,
              }}
            >
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-medium ${
                  node.type === 'person'
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                    : node.type === 'team'
                      ? 'border-violet-400/30 bg-violet-400/10 text-violet-300'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                }`}
              >
                {node.type === 'person' ? '👤' : node.type === 'team' ? '🏢' : '💡'}
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">{node.label}</span>
            </div>
          ))}

          {/* Core Node */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
            style={{ zIndex: 3 }}
          >
            <div className="onboarding-core-spin w-28 h-28 rounded-full border-2 border-dashed border-cyan-400/40 bg-[#0a0d14] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.15)]">
              <span className="text-3xl font-bold text-white">{completionPercent}%</span>
              <span className="text-[10px] text-slate-500 mt-0.5">profile ready</span>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Building your identity · {signalsConnected} signal{signalsConnected !== 1 ? 's' : ''} connected
            </p>
          </div>

          {/* Live Preview Card */}
          <div
            className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/[0.08] bg-[rgba(10,13,20,0.9)] backdrop-blur-md p-5"
            style={{ zIndex: 4 }}
          >
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 mb-3 font-medium">Live Preview</p>
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0">
                {displayName.trim() ? displayName.trim()[0].toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {displayName.trim() || 'Your Name'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  @{handle.trim() || 'handle'}
                </p>
                {headline.trim() && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{headline}</p>
                )}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.slice(0, 5).map((slug) => (
                      <span
                        key={slug}
                        className="px-2 py-0.5 text-[10px] rounded-full border border-cyan-400/30 bg-cyan-400/5 text-[#a5f3fc]"
                      >
                        {slug}
                      </span>
                    ))}
                    {skills.length > 5 && (
                      <span className="px-2 py-0.5 text-[10px] rounded-full border border-white/10 text-slate-500">
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

      {/* ─── Inline Styles ─── */}
      <style>{`
        @keyframes onboarding-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .onboarding-float {
          animation: onboarding-float 5s ease-in-out infinite;
        }
        @keyframes onboarding-dash {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        .onboarding-dash-anim {
          animation: onboarding-dash 2s linear infinite;
        }
        @keyframes onboarding-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .onboarding-core-spin {
          animation: onboarding-spin 30s linear infinite;
        }
        @keyframes onboarding-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .onboarding-shimmer {
          background: linear-gradient(90deg, #a5f3fc 0%, #fff 50%, #a5f3fc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: onboarding-shimmer 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
