import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { Modal } from '@/components/base/Modal';
import { Button } from '@/components/base/Button';
import { SkillPicker } from '@/components/profile/SkillPicker';
import type { TeamDTO, NeedPriority } from '@nodo/contracts';

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
}

interface NeedEntry {
  slug: string;
  priority: NeedPriority;
}

export function CreateTeamModal({ open, onClose }: CreateTeamModalProps) {
  const setMyTeamId = useTeamStore((s) => s.setMyTeamId);
  const currentEvent = useEventStore((s) => s.events.find((e) => e.id === s.currentEventId));
  const mode = currentEvent ? getExperienceMode(currentEvent.kind) : 'competition';

  const entityLabel = mode === 'collaboration' ? 'Project' : 'Team';

  const [name, setName] = useState('');
  const [pitch, setPitch] = useState('');
  const [needs, setNeeds] = useState<NeedEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Skill slugs derived from needs
  const selectedSlugs = needs.map((n) => n.slug);

  function handleSkillsChange(slugs: string[]) {
    // Add new ones, remove deleted ones
    const updated: NeedEntry[] = slugs.map((slug) => {
      const existing = needs.find((n) => n.slug === slug);
      return existing ?? { slug, priority: 'required' as NeedPriority };
    });
    setNeeds(updated);
  }

  function togglePriority(slug: string) {
    setNeeds((prev) =>
      prev.map((n) =>
        n.slug === slug
          ? { ...n, priority: n.priority === 'required' ? 'nice' : 'required' }
          : n,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch<{ team: TeamDTO }>('/v1/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          pitch: pitch.trim() || null,
          needs: needs.map(({ slug, priority }) => ({ slug, priority })),
        }),
      });
      setMyTeamId(res.team.id);
      onClose();
      // Reset form
      setName('');
      setPitch('');
      setNeeds([]);
    } catch {
      setError('Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Create ${entityLabel}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="team-name" className="block text-xs text-muted mb-1">
            {entityLabel} Name *
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`My awesome ${entityLabel.toLowerCase()}...`}
            required
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Pitch */}
        <div>
          <label htmlFor="team-pitch" className="block text-xs text-muted mb-1">
            Pitch
          </label>
          <textarea
            id="team-pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="What are you building? Why should people join?"
            rows={3}
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        {/* Needs */}
        <div>
          <label className="block text-xs text-muted mb-1">
            Skills Needed
          </label>
          <SkillPicker value={selectedSlugs} onChange={handleSkillsChange} />

          {needs.length > 0 && (
            <div className="mt-2 space-y-1">
              {needs.map((need) => (
                <div
                  key={need.slug}
                  className="flex items-center justify-between px-2 py-1 rounded bg-panel-2 border border-border"
                >
                  <span className="text-xs text-white">{need.slug}</span>
                  <button
                    type="button"
                    onClick={() => togglePriority(need.slug)}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      need.priority === 'required'
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-white/5 text-muted border border-border'
                    }`}
                  >
                    {need.priority}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : `Create ${entityLabel}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
