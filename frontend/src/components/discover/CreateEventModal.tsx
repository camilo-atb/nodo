import { useState } from 'react';
import { Modal } from '@/components/base/Modal';
import { Button } from '@/components/base/Button';
import { apiFetch } from '@/lib/api';
import { useEventStore, type NodoEvent, type EventType } from '@/stores/eventStore';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'project', label: 'Project' },
];

export function CreateEventModal({ open, onClose }: CreateEventModalProps) {
  const addEvent = useEventStore((s) => s.addEvent);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('hackathon');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const created = await apiFetch<NodoEvent>('/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          kind: type,
          // Epoch ms, nunca ISO string: es la convención del contrato (docs/09).
          startsAt: startDate ? new Date(startDate).getTime() : null,
          endsAt: endDate ? new Date(endDate).getTime() : null,
        }),
      });
      addEvent(created);
      onClose();
    } catch {
      // Best-effort — for demo, event creation may not have backend yet
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    'w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors bg-white border-gray-200 text-[#111318] placeholder:text-gray-400 focus:border-[#12c7e5] focus:ring-4 focus:ring-[#12c7e5]/10 dark:bg-[#101317] dark:border-[#20262d] dark:text-[#f4f6f8] dark:placeholder:text-[#68717d]';

  return (
    <Modal open={open} onClose={onClose} title="Create Opportunity">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClasses}
        />

        <textarea
          placeholder="What will you build? Who do you need?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClasses}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType)}
          className={inputClasses}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-500 dark:text-[#9da6b1] mb-1 block">Start</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className={inputClasses}
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 dark:text-[#9da6b1] mb-1 block">End</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className={inputClasses}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
