import { useState, useEffect } from 'react';
import { Modal } from '@/components/base/Modal';
import { SkillPicker } from '@/components/profile/SkillPicker';
import { useSessionStore } from '@/stores/sessionStore';
import { apiFetch } from '@/lib/api';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type Availability = 'full' | 'partial' | 'evenings';

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'full', label: 'Full-time' },
  { value: 'partial', label: 'Partial' },
  { value: 'evenings', label: 'Evenings only' },
];

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const personId = useSessionStore((s) => s.personId);
  const profile = useSessionStore((s) => s.profile);
  const setProfile = useSessionStore((s) => s.setProfile);

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability>('full');
  const [saving, setSaving] = useState(false);

  // Sync form with profile on open
  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.name ?? '');
      setHeadline(profile.headline ?? '');
      setBio(profile.bio ?? '');
    }
  }, [open, profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId) return;

    setSaving(true);
    try {
      await apiFetch(`/v1/people/${personId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(displayName.trim() && { displayName: displayName.trim() }),
          ...(headline.trim() && { headline: headline.trim() }),
          ...(bio.trim() && { bioRaw: bio.trim() }),
          ...(skills.length > 0 && { skills }),
          availability,
        }),
      });
      // Update local profile state
      setProfile({ name: displayName, headline, bio });
      onClose();
    } catch (err) {
      console.error('[Nodo] Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Name */}
        <div>
          <label htmlFor="edit-name" className="block text-xs font-medium text-muted mb-1">
            Display Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Your name"
          />
        </div>

        {/* Headline */}
        <div>
          <label htmlFor="edit-headline" className="block text-xs font-medium text-muted mb-1">
            Headline
          </label>
          <input
            id="edit-headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="e.g. Full-stack developer"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="edit-bio" className="block text-xs font-medium text-muted mb-1">
            Bio
          </label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            placeholder="Tell others about yourself..."
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Skills
          </label>
          <SkillPicker value={skills} onChange={setSkills} />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="edit-availability" className="block text-xs font-medium text-muted mb-1">
            Availability
          </label>
          <select
            id="edit-availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as Availability)}
            className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-muted hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-accent text-white hover:bg-accent-2 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
