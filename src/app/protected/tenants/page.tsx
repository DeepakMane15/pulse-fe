import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { isAxiosError } from 'axios';

export type TenantRow = {
  _id: string;
  name: string;
  slug: string;
  status: string;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

type TenantStatus = 'active' | 'suspended' | 'archived';

type PageSize = 20 | 50 | 100;

type ModalState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; tenant: TenantRow };

const STATUS_OPTIONS: TenantStatus[] = ['active', 'suspended', 'archived'];

type TenantsMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const emptyMeta: TenantsMeta = { total: 0, page: 1, limit: 20, totalPages: 0 };

export default function TenantsPage() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [meta, setMeta] = useState<TenantsMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formStatus, setFormStatus] = useState<TenantStatus>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);

      const { data } = await api.get<{ data: TenantRow[]; meta: TenantsMeta }>(
        `/tenants?${params.toString()}`
      );
      setRows(data.data ?? []);
      setMeta(data.meta ?? emptyMeta);
    } catch {
      setError('Could not load tenants.');
      setRows([]);
      setMeta(emptyMeta);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page, meta]);

  function openAdd() {
    setFormName('');
    setFormSlug('');
    setFormStatus('active');
    setFormError(null);
    setModal({ open: true, mode: 'add' });
  }

  function openEdit(t: TenantRow) {
    setFormName(t.name);
    setFormSlug(t.slug);
    setFormStatus((t.status as TenantStatus) || 'active');
    setFormError(null);
    setModal({ open: true, mode: 'edit', tenant: t });
  }

  function closeModal() {
    if (saving) return;
    setModal({ open: false });
    setFormError(null);
  }

  async function submitModal(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name || name.length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      if (modal.open && modal.mode === 'add') {
        const slug = formSlug.trim() || undefined;
        await api.post('/tenants', {
          name,
          ...(slug ? { slug } : {}),
          status: formStatus
        });
      } else if (modal.open && modal.mode === 'edit') {
        const tid = modal.tenant._id;
        const payload: { name?: string; slug?: string; status?: TenantStatus } = {};
        if (name !== modal.tenant.name) payload.name = name;
        const slugTrim = formSlug.trim();
        if (slugTrim !== modal.tenant.slug) payload.slug = slugTrim;
        if (formStatus !== modal.tenant.status) payload.status = formStatus;
        if (Object.keys(payload).length === 0) {
          closeModal();
          return;
        }
        await api.patch(`/tenants/${tid}`, payload);
      }
      await loadRows();
      setModal({ open: false });
    } catch (err) {
      const msg = isAxiosError(err)
        ? String(err.response?.data?.message ?? err.message)
        : 'Request failed';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tenants/${deleteTarget._id}`);
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      const msg = isAxiosError(err)
        ? String(err.response?.data?.message ?? err.message)
        : 'Delete failed';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);
  const totalPagesSafe = Math.max(1, meta.totalPages);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Tenants</h1>
          <p className="mt-1 text-slate-600">
            All tenants in the platform. User count includes users assigned to each tenant. Click a
            count to open user management for that tenant.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-pulse-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pulse-800"
        >
          Add tenant
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-lavender-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="tenant-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search by name
          </label>
          <input
            id="tenant-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tenants…"
            className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="tenant-filter-status" className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="tenant-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full min-w-[10rem] rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25 sm:w-auto"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lavender-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No tenants match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((t) => (
                  <tr key={t._id} className="hover:bg-lavender-50/50">
                    <td className="px-4 py-3 font-medium text-pulse-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.slug}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/users?tenantId=${encodeURIComponent(t._id)}&tenant=${encodeURIComponent(t.name)}`}
                        className="font-semibold text-pulse-700 underline decoration-pulse-400 underline-offset-2 hover:text-pulse-900"
                      >
                        {t.userCount ?? 0}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="mr-2 rounded-md px-2 py-1 text-xs font-medium text-pulse-800 hover:bg-lavender-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-lavender-100 bg-lavender-50/50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {meta.total === 0
              ? 'No results'
              : `Showing ${rangeStart}–${rangeEnd} of ${meta.total}`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="tenant-page-size" className="text-sm text-slate-600 whitespace-nowrap">
                Rows per page
              </label>
              <select
                id="tenant-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                className="rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-sm font-medium text-pulse-800 hover:bg-lavender-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {meta.total === 0 ? 0 : page} of {meta.total === 0 ? 0 : totalPagesSafe}
              </span>
              <button
                type="button"
                disabled={loading || meta.total === 0 || page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-lavender-300 bg-white px-3 py-1.5 text-sm font-medium text-pulse-800 hover:bg-lavender-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pulse-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tenant-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-lavender-200 bg-white p-6 shadow-xl">
            <h2 id="tenant-modal-title" className="text-lg font-semibold text-pulse-900">
              {modal.mode === 'add' ? 'Add tenant' : 'Edit tenant'}
            </h2>
            <form className="mt-4 space-y-4" onSubmit={submitModal}>
              <div>
                <label htmlFor="tenant-name" className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="tenant-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  required
                  minLength={2}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="tenant-slug" className="mb-1 block text-sm font-medium text-slate-700">
                  Slug <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="tenant-slug"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  placeholder="auto-generated from name if empty"
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="tenant-status" className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="tenant-status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as TenantStatus)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  disabled={saving}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-100">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-lavender-300 bg-white px-4 py-2 text-sm font-medium text-pulse-800 hover:bg-lavender-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-pulse-700 px-4 py-2 text-sm font-semibold text-white hover:bg-pulse-800 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : modal.mode === 'add' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pulse-900/40 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-tenant-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-lavender-200 bg-white p-6 shadow-xl">
            <h2 id="delete-tenant-title" className="text-lg font-semibold text-pulse-900">
              Delete tenant?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.slug}
              ). This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !deleting && setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-lavender-300 bg-white px-4 py-2 text-sm font-medium text-pulse-800 hover:bg-lavender-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
