import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type UserRow = {
  id: string;
  email: string;
  tenantId: string;
  roleName: string | null;
  isActive: boolean;
  createdAt?: string;
};

export default function ManageUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ data: UserRow[] }>('/users');
        if (!cancelled) {
          setRows(data.data ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load users.');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Manage Users</h1>
        <p className="mt-1 text-slate-600">
          Users visible to your role (tenant admins see their tenant; super-admins see all).
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-lavender-200 bg-lavender-50/80 text-xs font-semibold uppercase tracking-wide text-pulse-800">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lavender-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-amber-800">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No users.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-lavender-50/50">
                    <td className="px-4 py-3 font-medium text-pulse-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">{u.roleName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.tenantId}</td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="text-emerald-700">Yes</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
