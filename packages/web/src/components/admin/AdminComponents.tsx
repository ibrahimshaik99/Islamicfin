import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../../lib/api';
import { LoadingState, ErrorState, EmptyState } from '../ui';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseAdminListOptions {
  path: string;
  page?: number;
  limit?: number;
  search?: string;
  filters?: Record<string, string>;
}

interface UseAdminListResult<T> {
  data: T[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setPage: (p: number) => void;
  setSearch: (s: string) => void;
  setFilters: (f: Record<string, string>) => void;
}

export function useAdminList<T extends Record<string, unknown>>({ path, page = 1, limit = 20, search = '', filters = {} }: UseAdminListOptions): UseAdminListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentSearch, setCurrentSearch] = useState(search);
  const [currentFilters, setCurrentFilters] = useState(filters);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(limit));
      if (currentSearch) params.set('search', currentSearch);
      Object.entries(currentFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const res = await api<{ data: T[]; pagination: Pagination }>(`${path}?${params.toString()}`);
      setData(res.data);
      setPagination(res.pagination);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [path, currentPage, limit, currentSearch, currentFilters, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData();
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    data,
    pagination,
    loading,
    error,
    refetch,
    setPage: setCurrentPage,
    setSearch: (s) => { setCurrentSearch(s); setCurrentPage(1); },
    setFilters: (f) => { setCurrentFilters(f); setCurrentPage(1); },
  };
}

interface UseAdminDetailOptions {
  path: string;
}

interface UseAdminDetailResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdminDetail<T>({ path }: UseAdminDetailOptions): UseAdminDetailResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api<{ data: T }>(path, { signal: controller.signal })
      .then((res) => {
        const unwrapped = (res && typeof res === 'object' && 'data' in res)
          ? (res as { data: T }).data
          : res as unknown as T;
        setData(unwrapped);
      })
      .catch((err) => {
        if (err instanceof ApiError) setError(err.message);
        else if (!(err instanceof DOMException && err.name === 'AbortError')) setError('Failed to load data');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [path, refreshKey]);

  return { data, loading, error, refetch: () => setRefreshKey((k) => k + 1) };
}

/* ───── Search Input ───── */

export function SearchInput({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
      />
    </div>
  );
}

/* ───── Filter Select ───── */

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-slate-50 hover:bg-white focus:bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ───── Pagination ───── */

export function Pagination({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      <p className="text-sm text-slate-500">
        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
      </p>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
          const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
          const p = start + i;
          if (p > pagination.totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${p === pagination.page ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-600/20' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ───── Status Badge ───── */

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REVIEWED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  DISMISSED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  SUSPENDED: 'bg-red-50 text-red-700 border border-red-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  DISABLED: 'bg-red-50 text-red-700 border border-red-200',
  CONFIRMED: 'bg-red-50 text-red-700 border border-red-200',
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border border-amber-200',
  FLAGGED: 'bg-amber-50 text-amber-700 border border-amber-200',
  PAST_DUE: 'bg-orange-50 text-orange-700 border border-orange-200',
  NEEDS_REVISION: 'bg-orange-50 text-orange-700 border border-orange-200',
  UNDER_REVIEW: 'bg-orange-50 text-orange-700 border border-orange-200',
  COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border border-slate-200',
  ARCHIVED: 'bg-slate-100 text-slate-600 border border-slate-200',
  TRIALING: 'bg-blue-50 text-blue-700 border border-blue-200',
  LOW: 'bg-blue-50 text-blue-700 border border-blue-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border border-red-200',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ───── Confirm Dialog ───── */

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, loading }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-600/20 transition-colors">
            {loading && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Data Table ───── */

export function DataTable<T extends Record<string, unknown>>({ columns, data, loading, error, emptyMessage = 'No data found', onRetry }: {
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode; className?: string }[];
  data: T[];
  loading: boolean;
  error: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (data.length === 0) return <EmptyState title={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((col) => (
              <th key={col.key} className={`text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider ${col.className || ''}`}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───── Mobile Card List ───── */

export function MobileCardList<T>({ items, renderItem, emptyMessage = 'No data found' }: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
}) {
  if (items.length === 0) return <EmptyState title={emptyMessage} />;
  return <div className="space-y-3">{items.map(renderItem)}</div>;
}
