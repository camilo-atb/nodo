import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useSessionStore } from '@/stores/sessionStore';
import { Button } from '@/components/base/Button';
import { Spinner } from '@/components/base/Spinner';
import { SkillPicker } from './SkillPicker';
import type { CreatePersonResponse, ExtractSkillsResponse, Availability } from '@nodo/contracts';

interface ProfileFormProps {
  onSuccess: (recoveryCode: string) => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const setSession = useSessionStore((s) => s.setSession);

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
      // Silently fail — skills can be added manually
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
      const res = await apiFetch<CreatePersonResponse>('/v1/people', {
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

      setSession(res.person.id, res.sessionToken);
      onSuccess(res.recoveryCode);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setHandleError('This handle is already taken. Try another one.');
      } else if (err instanceof ApiError) {
        const body = err.body as { message?: string };
        setError(body?.message ?? 'Something went wrong. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white">Create your profile</h2>
        <p className="text-sm text-muted">Tell us about yourself so we can match you with the right team.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red/5 border border-red/20 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {/* Display Name */}
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="block text-sm font-medium text-white">
          Display Name <span className="text-red">*</span>
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2.5 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-violet transition-shadow"
        />
      </div>

      {/* Handle */}
      <div className="space-y-1.5">
        <label htmlFor="handle" className="block text-sm font-medium text-white">
          Handle <span className="text-red">*</span>
        </label>
        <input
          id="handle"
          type="text"
          value={handle}
          onChange={(e) => { setHandle(e.target.value.toLowerCase()); setHandleError(null); }}
          placeholder="your-handle"
          required
          className={`w-full rounded-lg bg-panel-2 border px-3 py-2.5 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 transition-shadow ${
            handleError ? 'border-red focus:ring-red' : 'border-border focus:ring-violet'
          }`}
        />
        {handleError ? (
          <p className="text-xs text-red">{handleError}</p>
        ) : (
          <p className="text-xs text-muted-2">Lowercase letters, digits, hyphens, and underscores. 2–30 characters.</p>
        )}
      </div>

      {/* Headline */}
      <div className="space-y-1.5">
        <label htmlFor="headline" className="block text-sm font-medium text-white">Headline</label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Backend Engineer"
          className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2.5 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-violet transition-shadow"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="bioRaw" className="block text-sm font-medium text-white">Bio</label>
        <textarea
          id="bioRaw"
          value={bioRaw}
          onChange={(e) => setBioRaw(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={4}
          className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2.5 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-violet transition-shadow resize-none"
        />
        <button
          type="button"
          onClick={handleExtractSkills}
          disabled={extracting || !bioRaw.trim()}
          className="inline-flex items-center gap-2 text-xs text-violet hover:text-violet-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {extracting && <Spinner size="sm" />}
          {extracting ? 'Analyzing...' : '✨ Analyze Bio for Skills'}
        </button>
      </div>

      {/* Skills */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-white">Skills</label>
        <SkillPicker value={skills} onChange={setSkills} />
      </div>

      {/* Availability */}
      <div className="space-y-1.5">
        <label htmlFor="availability" className="block text-sm font-medium text-white">Availability</label>
        <select
          id="availability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value as Availability)}
          className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet transition-shadow"
        >
          <option value="full">Full-time</option>
          <option value="partial">Partial</option>
          <option value="evenings">Evenings only</option>
        </select>
      </div>

      {/* Language */}
      <div className="space-y-1.5">
        <label htmlFor="language" className="block text-sm font-medium text-white">Language</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
          className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet transition-shadow"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={submitting || !displayName.trim() || !handle.trim()}
        className="w-full"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" />
            Creating...
          </span>
        ) : (
          'Create Profile'
        )}
      </Button>
    </form>
  );
}
