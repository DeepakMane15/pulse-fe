import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser } from '../../lib/auth';
import { hasClearance } from '../../lib/clearances';

type ClearanceLayoutProps = {
  /** Bitmask — same semantics as backend `requireClearance(mask)`. */
  requiredMask: number;
};

/**
 * Nested layout: child routes only render if the user has the required permission bits.
 * Example: wrap an admin segment with requiredMask={PERMISSIONS.MANAGE_USERS}.
 */
export function ClearanceLayout({ requiredMask }: ClearanceLayoutProps) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasClearance(user.clearanceLevel, requiredMask)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
