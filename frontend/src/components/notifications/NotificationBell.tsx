import { useState, useRef, useEffect } from 'react';
import { useFeedStore } from '@/stores/feedStore';

interface NotificationBellProps {
  unseenCount?: number;
}

export function NotificationBell({ unseenCount: _externalCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = useFeedStore((s) => s.lines);

  const unseenCount = Math.max(0, lines.length - seenCount);

  // Click-outside detection
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen((prev) => !prev);
    // Mark all as seen when opening
    if (!open) {
      setSeenCount(lines.length);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="relative text-gray-500 hover:text-[#111318] dark:text-gray-400 dark:hover:text-white transition-colors"
        aria-label="Notifications"
        onClick={handleOpen}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[8px] font-bold text-white bg-red-500 rounded-full">
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden
          bg-white border-gray-200
          dark:bg-[#101317] dark:border-[#20262d]">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-[#20262d]">
            <span className="text-xs font-bold text-[#111318] dark:text-[#f4f6f8]">Activity</span>
          </div>

          {/* Lines */}
          <div className="max-h-[320px] overflow-y-auto">
            {lines.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-gray-400 dark:text-[#68717d]">No activity yet</p>
                <p className="text-[10px] text-gray-300 dark:text-[#4a5060] mt-1">Events will appear here in real time</p>
              </div>
            ) : (
              lines.slice(0, 20).map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 border-b border-gray-50 dark:border-[#15191e] last:border-b-0
                    hover:bg-gray-50 dark:hover:bg-[#15191e] transition-colors"
                >
                  <span className="text-sm shrink-0 mt-0.5">{line.icon}</span>
                  <p className="text-[11px] leading-relaxed text-[#111318] dark:text-[#f4f6f8]">
                    {line.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
