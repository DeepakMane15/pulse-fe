import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { getStoredToken, getStoredUser } from '../../lib/auth';

/**
 * Authenticated shell: token + stored user required. Matches backend session expectations.
 */
export default function ProtectedLayout() {
  const location = useLocation();
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
