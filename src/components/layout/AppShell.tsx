import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from '../../lib/auth';
import { persistor } from '../../store';
import { hasClearance, PERMISSIONS } from '../../lib/clearances';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const clearance = user?.clearanceLevel ?? 0;
  const showVideoLibrary = hasClearance(clearance, PERMISSIONS.VIEW_VIDEO);
  const showTenants = hasClearance(clearance, PERMISSIONS.GLOBAL_ADMIN);
  const showManageUsers = hasClearance(clearance, PERMISSIONS.MANAGE_USERS);

  useEffect(() => {
    if (!profileOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [profileOpen]);

  function logout() {
    clearSession();
    void persistor.purge();
    setProfileOpen(false);
    navigate('/login', { replace: true });
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-pulse-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-lavender-200 bg-pulse-700 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-8">
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold tracking-tight"
                aria-hidden
              >
                P
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:inline">Pulse</span>
            </div>

            <nav
              className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2"
              aria-label="Main"
            >
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              {showVideoLibrary && (
                <NavLink to="/video-library" className={linkClass}>
                  Video Library
                </NavLink>
              )}
              {showTenants && (
                <NavLink to="/tenants" className={linkClass}>
                  Tenants
                </NavLink>
              )}
              {showManageUsers && (
                <NavLink to="/users" className={linkClass}>
                  Manage Users
                </NavLink>
              )}
            </nav>
          </div>

          <div className="relative shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex max-w-[12rem] items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-left text-sm hover:bg-white/20 sm:max-w-xs"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="block truncate font-medium">{user?.email ?? 'Account'}</span>
                <span className="block truncate text-xs text-pulse-200">{user?.role ?? ''}</span>
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-pulse-200 transition ${profileOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-lavender-200 bg-white py-2 text-slate-900 shadow-lg"
                role="menu"
              >
                <div className="border-b border-lavender-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-pulse-900">{user?.email}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Role: {user?.role}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  className="mt-1 w-full px-4 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-lavender-200 bg-lavender-50 py-4 text-center text-xs text-slate-500">
        Pulse video platform · Indigo & lavender
      </footer>
    </div>
  );
}
