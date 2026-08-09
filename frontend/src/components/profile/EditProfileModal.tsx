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

const inputClasses =
  'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#12c7e5] border bg-gray-50 border-gray-200 text-[#111318] placeholder:text-gray-400 dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#f4f6f8] dark:placeholder:text-[#68717d]';

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
          <label htmlFor="edit-name" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Display Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClasses}
            placeholder="Your name"
          />
        </div>

        {/* Headline */}
        <div>
          <label htmlFor="edit-headline" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Headline
          </label>
          <input
            id="edit-headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className={inputClasses}
            placeholder="e.g. Full-stack developer"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="edit-bio" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Bio
          </label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className={`${inputClasses} resize-none`}
            placeholder="Tell others about yourself..."
          />
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Skills
          </label>
          <SkillPicker value={skills} onChange={setSkills} />
        </div>

        {/* Availability */}
        <div>
          <label htmlFor="edit-availability" className="block text-xs font-medium mb-1 text-gray-500 dark:text-[#9da6b1]">
            Availability
          </label>
          <select
            id="edit-availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as Availability)}
            className={inputClasses}
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
            className="px-4 py-2 text-sm rounded-lg transition-colors
              text-gray-500 hover:text-[#111318] hover:bg-gray-100
              dark:text-[#9da6b1] dark:hover:text-white dark:hover:bg-[#15191e]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb5d0] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
