import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { clearSession, getStoredToken, getStoredUser } from '../../lib/auth';

/**
 * Authenticated shell: token + stored user required. Matches backend session expectations.
 */
export default function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell
      rightSlot={
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-pulse-100 sm:inline">{user.email}</span>
          <button
            type="button"
            onClick={() => {
              clearSession();
              navigate('/login', { replace: true });
            }}
            className="rounded-md bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
          >
            Log out
          </button>
        </div>
      }
    >
      <Outlet />
    </AppShell>
  );
}
