import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export type TenantRow = {
  _id: string;
  name: string;
  slug: string;
  status: string;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function TenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ data: TenantRow[] }>('/tenants');
        if (!cancelled) {
          setRows(data.data ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load tenants.');
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
        <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Tenants</h1>
        <p className="mt-1 text-slate-600">
          All tenants in the platform. User count includes users assigned to each tenant.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lavender-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-lavender-200 bg-lavender-50/80 text-xs font-semibold uppercase tracking-wide text-pulse-800">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
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
                    No tenants.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((t) => (
                  <tr key={t._id} className="hover:bg-lavender-50/50">
                    <td className="px-4 py-3 font-medium text-pulse-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-800">{t.userCount ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString(undefined, {
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
