import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { Spinner } from '@/components/base/Spinner';

export function ConnectionBanner() {
  const connectionStatus = useGraphStore((s) => s.connectionStatus);
  const [dismissed, setDismissed] = useState(false);

  // Ready → render nothing
  if (connectionStatus === 'ready') return null;

  // If dismissed and it's a degraded state, stay hidden
  if (dismissed && (connectionStatus === 'degraded' || connectionStatus === 'degraded-http')) {
    return null;
  }

  let bgClass = '';
  let textContent: React.ReactNode = null;
  let showClose = false;
  let showSpinner = false;

  switch (connectionStatus) {
    case 'idle':
    case 'connecting':
      bgClass = 'bg-panel-2 border-border';
      textContent = 'Connecting...';
      showSpinner = true;
      break;
    case 'reconnecting':
      bgClass = 'bg-amber/10 border-amber/30';
      textContent = <span className="text-amber">Reconnecting...</span>;
      showSpinner = true;
      break;
    case 'degraded':
    case 'degraded-http':
      bgClass = 'bg-amber/10 border-amber/30';
      textContent = <span className="text-amber">Connection unstable</span>;
      showClose = true;
      break;
    case 'blocked':
      bgClass = 'bg-red/10 border-red/30';
      textContent = (
        <span className="flex items-center gap-2">
          <span className="text-red">Connection failed</span>
          <button
            className="text-[11px] px-2 py-0.5 rounded bg-red/20 text-red hover:bg-red/30 transition-colors"
            onClick={() => {
              // TODO: actual retry logic
            }}
          >
            Retry
          </button>
        </span>
      );
      break;
  }

  return (
    <div
      className={`fixed top-14 left-0 right-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-xs border-b transition-all duration-300 ease-out ${bgClass}`}
    >
      {showSpinner && <Spinner size="sm" />}
      {textContent}
      {showClose && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 text-muted hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
