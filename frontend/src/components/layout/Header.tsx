import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresenceStore } from '@/stores/presenceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Avatar } from '@/components/base/Avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EditProfileModal } from '@/components/profile/EditProfileModal';

export type MainTab = 'marketplace' | 'graph' | 'activity';

interface HeaderProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const onlineCount = usePresenceStore((s) => s.count);
  const profile = useSessionStore((s) => s.profile);
  const clearSession = useSessionStore((s) => s.clearSession);
  const name = profile?.name ?? 'User';

  const tabs: { value: MainTab; label: string }[] = [
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'graph', label: 'Graph' },
    { value: 'activity', label: 'Activity' },
  ];

  // Click-outside detection
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  function handleLogout() {
    clearSession();
    setDropdownOpen(false);
    navigate('/');
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border bg-bg/80 backdrop-blur-md">
        {/* Left: Logo — navigates to /discover */}
        <button
          onClick={() => navigate('/discover')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Go to Discover"
        >
          <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="6" r="2" />
            <circle cx="5" cy="18" r="2" />
            <circle cx="19" cy="18" r="2" />
            <line x1="7" y1="7" x2="10" y2="10" />
            <line x1="17" y1="7" x2="14" y2="10" />
            <line x1="7" y1="17" x2="10" y2="14" />
            <line x1="17" y1="17" x2="14" y2="14" />
          </svg>
          <span className="text-sm font-bold text-white">Nodo</span>
        </button>

        {/* Center: Nav tabs */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.value
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right: Online counter, bell, avatar */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
            {onlineCount}
          </span>

          <NotificationBell unseenCount={0} />

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="cursor-pointer"
              aria-label="User menu"
            >
              <Avatar name={name} size="sm" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-panel border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setEditProfileOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-panel-2 transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-panel-2 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </>
  );
}
