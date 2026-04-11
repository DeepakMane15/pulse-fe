import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '../../../lib/api';
import { getStoredUser } from '../../../lib/auth';

type UserRow = {
  id: string;
  email: string;
  tenantId: string;
  tenantName?: string | null;
  roleId: string;
  roleName: string | null;
  isActive: boolean;
  createdAt?: string;
};

type PageSize = 20 | 50 | 100;

type UsersMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const emptyMeta: UsersMeta = { total: 0, page: 1, limit: 20, totalPages: 0 };

const ROLE_OPTIONS = ['viewer', 'editor', 'admin', 'super_admin'] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

type UserModal =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; user: UserRow };

type TenantOption = { _id: string; name: string };

export default function ManageUsersPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const tenantIdFilter = searchParams.get('tenantId')?.trim() || '';
  const tenantLabel = searchParams.get('tenant')?.trim() || '';

  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<UsersMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  const [modal, setModal] = useState<UserModal>({ open: false });
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formTenantId, setFormTenantId] = useState('');
  const [formRoleName, setFormRoleName] = useState<RoleOption>('viewer');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter, tenantIdFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (tenantIdFilter) params.set('tenantId', tenantIdFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('roleName', roleFilter);
      if (activeFilter === 'active') params.set('isActive', 'true');
      if (activeFilter === 'inactive') params.set('isActive', 'false');

      const { data } = await api.get<{ data: UserRow[]; meta: UsersMeta }>(
        `/users?${params.toString()}`
      );
      setRows(data.data ?? []);
      setMeta(data.meta ?? emptyMeta);
    } catch {
      setError('Could not load users.');
      setRows([]);
      setMeta(emptyMeta);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, roleFilter, activeFilter, tenantIdFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page, meta]);

  function clearTenantFilter() {
    setSearchParams({});
  }

  async function openAdd() {
    setFormEmail('');
    setFormPassword('');
    setFormTenantId(tenantIdFilter || currentUser?.tenantId || '');
    setFormRoleName('viewer');
    setFormIsActive(true);
    setFormError(null);
    if (isSuperAdmin) {
      try {
        const { data } = await api.get<{ data: TenantOption[]; meta?: UsersMeta }>(
          '/tenants?limit=100&page=1'
        );
        setTenantOptions(data.data ?? []);
      } catch {
        setTenantOptions([]);
      }
    }
    setModal({ open: true, mode: 'add' });
  }

  function openEdit(u: UserRow) {
    setFormEmail(u.email);
    setFormPassword('');
    setFormTenantId(String(u.tenantId));
    setFormRoleName((u.roleName as RoleOption) || 'viewer');
    setFormIsActive(u.isActive);
    setFormError(null);
    setModal({ open: true, mode: 'edit', user: u });
  }

  function closeModal() {
    if (saving) return;
    setModal({ open: false });
    setFormError(null);
  }

  async function submitModal(e: React.FormEvent) {
    e.preventDefault();
    const email = formEmail.trim();
    if (!email) {
      setFormError('Email is required.');
      return;
    }

    if (modal.open && modal.mode === 'add') {
      if (!formPassword || formPassword.length < 6) {
        setFormError('Password must be at least 6 characters.');
        return;
      }
      const tid = isSuperAdmin ? formTenantId : currentUser?.tenantId;
      if (!tid) {
        setFormError('Tenant is required.');
        return;
      }
    }

    setFormError(null);
    setSaving(true);
    try {
      if (modal.open && modal.mode === 'add') {
        const tid = isSuperAdmin ? formTenantId : currentUser!.tenantId;
        await api.post('/users', {
          email,
          password: formPassword,
          tenantId: tid,
          roleName: formRoleName,
          isActive: formIsActive
        });
      } else if (modal.open && modal.mode === 'edit') {
        const u = modal.user;
        const body: {
          email?: string;
          password?: string;
          roleName?: RoleOption;
          isActive?: boolean;
        } = {};
        if (email !== u.email) body.email = email;
        if (formPassword.trim()) body.password = formPassword.trim();
        if (formRoleName !== (u.roleName as RoleOption | null)) body.roleName = formRoleName;
        if (formIsActive !== u.isActive) body.isActive = formIsActive;
        if (Object.keys(body).length === 0) {
          closeModal();
          return;
        }
        await api.patch(`/users/${u.id}`, body);
      }
      await loadUsers();
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
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadUsers();
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
          <h1 className="text-3xl font-semibold tracking-tight text-pulse-900">Manage Users</h1>
          <p className="mt-1 text-slate-600">
            Users visible to your role (tenant admins see their tenant; super-admins see all).
          </p>
          {tenantIdFilter ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-lavender-200 bg-lavender-50/80 px-4 py-3 text-sm">
              <span className="text-slate-700">
                Showing users for tenant{' '}
                <strong className="text-pulse-900">{tenantLabel || tenantIdFilter}</strong>
              </span>
              <button
                type="button"
                onClick={clearTenantFilter}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-pulse-800 shadow-sm ring-1 ring-lavender-200 hover:bg-lavender-50"
              >
                Show all users
              </button>
              <Link
                to="/tenants"
                className="text-xs font-medium text-pulse-700 underline underline-offset-2 hover:text-pulse-900"
              >
                Back to tenants
              </Link>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-pulse-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pulse-800"
        >
          Add user
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-lavender-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label htmlFor="user-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search by email
          </label>
          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by email…"
            className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="user-filter-role" className="mb-1 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              id="user-filter-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full min-w-[10rem] rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25 sm:w-auto"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="user-filter-active" className="mb-1 block text-sm font-medium text-slate-700">
              Active
            </label>
            <select
              id="user-filter-active"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full min-w-[10rem] rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25 sm:w-auto"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
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
                    No users match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-lavender-50/50">
                    <td className="px-4 py-3 font-medium text-pulse-900">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">{u.roleName ?? '—'}</td>
                    <td
                      className="px-4 py-3 text-slate-700"
                      title={u.tenantName ? `Tenant id: ${u.tenantId}` : undefined}
                    >
                      {u.tenantName?.trim() ? (
                        u.tenantName
                      ) : (
                        <span className="font-mono text-xs text-slate-600">{u.tenantId}</span>
                      )}
                    </td>
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
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="mr-2 rounded-md px-2 py-1 text-xs font-medium text-pulse-800 hover:bg-lavender-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        disabled={currentUser?.id === u.id}
                        title={currentUser?.id === u.id ? 'You cannot delete your own account here' : undefined}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              <label htmlFor="user-page-size" className="text-sm text-slate-600 whitespace-nowrap">
                Rows per page
              </label>
              <select
                id="user-page-size"
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
          aria-labelledby="user-modal-title"
        >
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-lavender-200 bg-white p-6 shadow-xl">
            <h2 id="user-modal-title" className="text-lg font-semibold text-pulse-900">
              {modal.mode === 'add' ? 'Add user' : 'Edit user'}
            </h2>
            <form className="mt-4 space-y-4" onSubmit={submitModal}>
              <div>
                <label htmlFor="user-form-email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="user-form-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor="user-form-password" className="mb-1 block text-sm font-medium text-slate-700">
                  Password{' '}
                  {modal.mode === 'edit' && (
                    <span className="font-normal text-slate-400">(leave blank to keep)</span>
                  )}
                </label>
                <input
                  id="user-form-password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  required={modal.mode === 'add'}
                  minLength={modal.mode === 'add' ? 6 : undefined}
                  autoComplete={modal.mode === 'add' ? 'new-password' : 'new-password'}
                  disabled={saving}
                />
              </div>
              {modal.mode === 'add' && isSuperAdmin && (
                <div>
                  <label htmlFor="user-form-tenant" className="mb-1 block text-sm font-medium text-slate-700">
                    Tenant
                  </label>
                  <select
                    id="user-form-tenant"
                    value={formTenantId}
                    onChange={(e) => setFormTenantId(e.target.value)}
                    className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                    required
                    disabled={saving}
                  >
                    <option value="">Select tenant…</option>
                    {tenantOptions.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="user-form-role" className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="user-form-role"
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value as RoleOption)}
                  className="w-full rounded-lg border border-lavender-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-pulse-500 focus:ring-2 focus:ring-pulse-500/25"
                  disabled={saving}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="user-form-active"
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-lavender-300 text-pulse-700 focus:ring-pulse-500"
                  disabled={saving}
                />
                <label htmlFor="user-form-active" className="text-sm text-slate-700">
                  Active
                </label>
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
          aria-labelledby="delete-user-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-lavender-200 bg-white p-6 shadow-xl">
            <h2 id="delete-user-title" className="text-lg font-semibold text-pulse-900">
              Delete user?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Permanently remove <strong>{deleteTarget.email}</strong>? This cannot be undone.
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
