import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { Button } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import type { ApplicationDTO } from '@nodo/contracts';

interface ApplyButtonProps {
  teamId: string;
  teamName: string;
}

export function ApplyButton({ teamId, teamName }: ApplyButtonProps) {
  const myApplication = useTeamStore((s) => s.myApplication);
  const setMyApplication = useTeamStore((s) => s.setMyApplication);
  const currentEvent = useEventStore((s) => s.events.find((e) => e.id === s.currentEventId));
  const mode = currentEvent ? getExperienceMode(currentEvent.kind) : 'competition';

  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyLabel = mode === 'collaboration' ? 'Join Project' : 'Apply';
  const sentLabel = mode === 'collaboration' ? 'Request Sent' : 'Application Sent';

  if (myApplication) {
    if (myApplication.status === 'pending') {
      return (
        <Button variant="secondary" disabled>
          {sentLabel}
        </Button>
      );
    }
    if (myApplication.status === 'rejected' || myApplication.status === 'auto_rejected') {
      return (
        <p className="text-sm text-muted-2">Application was declined</p>
      );
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ application: ApplicationDTO }>(
        `/v1/teams/${teamId}/applications`,
        {
          method: 'POST',
          body: JSON.stringify({ message: message.trim() || null }),
        },
      );
      setMyApplication(res.application);
      setModalOpen(false);
      setMessage('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { error?: string };
        if (body.error === 'DUPLICATE_APPLICATION') {
          setError('You already have a pending application for this team.');
        } else {
          setError('Conflict — you may already have an application.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setModalOpen(true)}>
        {applyLabel}
      </Button>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${applyLabel} to ${teamName}`}>
        <div className="space-y-4">
          <div>
            <label htmlFor="apply-message" className="block text-xs text-muted mb-1">
              Message (optional)
            </label>
            <textarea
              id="apply-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself or mention relevant experience..."
              rows={4}
              className="w-full rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {error && <p className="text-xs text-red">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Sending...' : applyLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
