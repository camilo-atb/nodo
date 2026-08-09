import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { Modal } from '@/components/base/Modal';
import { Button } from '@/components/base/Button';
import { SkillPicker } from '@/components/profile/SkillPicker';
import { useGraphStore } from '@/stores/graphStore';
import type { TeamDTO, GraphSnapshot } from '@nodo/contracts';

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClasses =
  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#12c7e5] border bg-gray-50 border-gray-200 text-[#111318] placeholder:text-gray-400 dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#f4f6f8] dark:placeholder:text-[#68717d]';

export function CreateTeamModal({ open, onClose }: CreateTeamModalProps) {
  const setMyTeamId = useTeamStore((s) => s.setMyTeamId);
  const currentEvent = useEventStore((s) => s.events.find((e) => e.id === s.currentEventId));
  const mode = currentEvent ? getExperienceMode(currentEvent.kind) : 'competition';

  const entityLabel = mode === 'collaboration' ? 'Project' : 'Team';

  const [name, setName] = useState('');
  const [pitch, setPitch] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    const eventId = currentEvent?.id;

    try {
      const res = await apiFetch<{ team: TeamDTO }>('/v1/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          pitch: pitch.trim() || null,
          needs: skills.map((slug) => ({ slug, priority: 'required' })),
          ...(eventId && { eventId }),
        }),
      });
      setMyTeamId(res.team.id);

      // Optimistic: refetch graph snapshot so new team appears immediately
      // even if Portal realtime delivery is delayed
      if (eventId) {
        apiFetch<GraphSnapshot>(`/v1/graph?eventId=${encodeURIComponent(eventId)}`)
          .then((snapshot) => useGraphStore.getState().loadSnapshot(snapshot))
          .catch(() => {});
      }

      onClose();
      setName('');
      setPitch('');
      setSkills([]);
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
          <label htmlFor="team-name" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            {entityLabel} Name *
          </label>
          <input
            id="team-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`My awesome ${entityLabel.toLowerCase()}...`}
            required
            className={inputClasses}
          />
        </div>

        {/* Pitch */}
        <div>
          <label htmlFor="team-pitch" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Pitch
          </label>
          <textarea
            id="team-pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="What are you building? Why should people join?"
            rows={3}
            className={`${inputClasses} resize-none`}
          />
        </div>

        {/* Skills needed */}
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Skills Needed
          </label>
          <SkillPicker value={skills} onChange={setSkills} />
        </div>

        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

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
