import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { Spinner } from '@/components/base/Spinner';
import { EmptyState } from '@/components/base/EmptyState';
import { Button } from '@/components/base/Button';
import type { ApplicationDTO } from '@nodo/contracts';

interface ApplicationsPanelProps {
  teamId: string;
}

export function ApplicationsPanel({ teamId }: ApplicationsPanelProps) {
  const { applications, setApplications, updateApplication } = useTeamStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ applications: ApplicationDTO[] }>(`/v1/teams/${teamId}/applications`)
      .then((res) => {
        if (!cancelled) setApplications(res.applications);
      })
      .catch(() => {
        // silent — may not have applications yet
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [teamId, setApplications]);

  async function handleResolve(applicationId: string, action: 'accept' | 'reject') {
    try {
      await apiFetch(`/v1/applications/${applicationId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      updateApplication(applicationId, {
        status: action === 'accept' ? 'accepted' : 'rejected',
        resolvedAt: Date.now(),
      });
    } catch {
      // Handle error silently — could add toast later
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === 'pending');

  if (pending.length === 0) {
    return <EmptyState title="No pending applications" description="New applications will appear here." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Applications ({pending.length})</h3>
      {pending.map((app) => (
        <div
          key={app.id}
          className="border border-border rounded-lg bg-panel-2 p-3 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-white">{app.person.displayName}</span>
              <span className="ml-2 text-xs text-muted-2">@{app.person.handle}</span>
            </div>
          </div>
          {app.message && (
            <p className="text-xs text-muted leading-relaxed">{app.message}</p>
          )}
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="text-xs px-3 py-1"
              onClick={() => handleResolve(app.id, 'accept')}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              className="text-xs px-3 py-1"
              onClick={() => handleResolve(app.id, 'reject')}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
