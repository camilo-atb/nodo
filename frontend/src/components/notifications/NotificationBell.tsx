import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  unseenCount: number;
}

export function NotificationBell({ unseenCount }: NotificationBellProps) {
  const navigate = useNavigate();

  return (
    <button
      className="relative text-muted hover:text-white transition-colors"
      aria-label="Notifications"
      onClick={() => navigate('/app/notifications')}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
      {unseenCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red rounded-full">
          {unseenCount > 99 ? '99+' : unseenCount}
        </span>
      )}
    </button>
  );
}
