import { FormEvent, ReactElement, ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { OrderStatusBadge, LoadingSkeleton, EmptyStateCard, UserAvatar } from '../../components/ui';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import type {
  Announcement,
  KametiGroup,
  CrowdfundingProject,
  Product,
  ServiceListing,
  Order,
} from '../../lib/types';

/**
 * Barakah customer home.
 *
 * Every section renders only data backed by a real API response; sections with
 * no data are hidden rather than faked. The search bar navigates to the
 * marketplace with the query applied.
 */

interface DashboardInfo {
  community: { name: string; city?: string | null; state?: string | null };
}

/** Quick-access modules. Jobs/Events are omitted: no backend exists for them. */
const MODULES: { label: string; href: string; icon: ReactElement; tint: string }[] = [
  {
    label: 'Marketplace',
    href: '/app/marketplace',
    tint: 'bg-primary-50 text-primary-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />,
  },
  {
    label: 'Services',
    href: '/app/services',
    tint: 'bg-sky-50 text-sky-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17 21M11.42 15.17V9.83m0 0L6.32 4.75m5.1 5.1l5.1-5.1M6.32 4.75h11.36" />,
  },
  {
    label: 'Community',
    href: '/app/community',
    tint: 'bg-emerald-50 text-emerald-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />,
  },
  {
    label: 'Groups',
    href: '/app/community?tab=groups',
    tint: 'bg-teal-50 text-teal-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />,
  },
  {
    label: 'Kameti',
    href: '/app/kameti',
    tint: 'bg-gold-50 text-gold-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />,
  },
  {
    label: 'Islamic Finance',
    href: '/app/finance',
    tint: 'bg-violet-50 text-violet-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'Zakat',
    href: '/app/zakat',
    tint: 'bg-amber-50 text-amber-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />,
  },
  {
    label: 'Sadaqah',
    href: '/app/sadaqah',
    tint: 'bg-rose-50 text-rose-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />,
  },
  {
    label: 'Crowdfunding',
    href: '/app/projects',
    tint: 'bg-cyan-50 text-cyan-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: 'My Orders',
    href: '/app/orders',
    tint: 'bg-slate-100 text-slate-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
  },
  {
    label: 'Messages',
    href: '/app/messages',
    tint: 'bg-indigo-50 text-indigo-600',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />,
  },
  {
    label: 'Installments',
    href: '/app/bnpl',
    tint: 'bg-lime-50 text-lime-700',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 0h3.75m6 0h1.5m-1.5 0h-1.5m-6 0h3m-3 0h3m-6 0h6M6 21h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6a2.25 2.25 0 00-2.25 2.25v12A2.25 2.25 0 006 21z" />,
  },
];

export default function CustomerHome() {
  const { communityId, user } = useAuth();
  const navigate = useNavigate();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');

  const { data: dash } = useApi<DashboardInfo>(
    communityId ? `${prefix}/dashboard` : null,
  );
  const { data: announcements, loading: aLoad } = useApi<Announcement[]>(
    communityId ? `${prefix}/announcements?limit=4` : null,
  );
  const { data: products, loading: pLoad } = useApi<Product[]>(
    communityId ? `${prefix}/products?limit=8` : null,
  );
  const { data: kameti, loading: kLoad } = useApi<KametiGroup[]>(
    communityId ? `${prefix}/kameti/groups` : null,
  );
  const { data: projects, loading: prLoad } = useApi<CrowdfundingProject[]>(
    communityId ? `${prefix}/crowdfunding/projects` : null,
  );
  const { data: services, loading: sLoad } = useApi<ServiceListing[]>(
    communityId ? `${prefix}/services/listings` : null,
  );
  const { data: orders, loading: oLoad } = useApi<Order[]>(
    communityId ? `${prefix}/orders?limit=3` : null,
  );

  const loading = aLoad || pLoad || kLoad || prLoad || sLoad || oLoad;
  const greeting = getGreeting();
  const communityName = dash?.community?.name || 'your community';
  const locationLabel = dash?.community
    ? [dash.community.city, dash.community.state].filter(Boolean).join(', ')
    : '';
  const firstName = user?.name?.split(' ')[0] || 'there';

  const publishedAnnouncements = (announcements || []).filter(
    (a) => a.status === 'PUBLISHED',
  );
  const activeKameti = (kameti || []).filter((k) => k.status === 'ACTIVE');
  const donationProjects = (projects || []).filter(
    (p) => p.status === 'ACTIVE' && p.projectType === 'DONATION',
  );
  const activeServices = (services || []).filter((s) => s.status === 'ACTIVE');
  const banner = publishedAnnouncements[0];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/app/marketplace?search=${encodeURIComponent(q)}` : '/app/marketplace');
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line safe-top">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link to="/app" className="flex items-center gap-2 flex-shrink-0" aria-label="Barakah home">
              <span className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-card">
                B
              </span>
              <span className="hidden sm:block text-lg font-bold text-ink tracking-tight">Barakah</span>
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0 relative" role="search">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, services, people…"
                aria-label="Search products, services, people and communities"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-surface border border-line text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15 transition-colors"
              />
            </form>

            {/* Notifications + avatar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationBell />
              <Link
                to="/app/profile"
                className="flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-3 rounded-xl border border-line bg-white shadow-card hover:bg-surface transition-colors touch-target"
                aria-label="Your profile"
              >
                <UserAvatar name={user?.name || '?'} size="sm" />
                <span className="hidden md:block text-sm font-semibold text-ink max-w-[90px] truncate">
                  {user?.name}
                </span>
              </Link>
            </div>
          </div>

          {/* Location chip */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted">
            <svg className="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="font-medium text-ink/70">{communityName}</span>
            {locationLabel && <span>· {locationLabel}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-8">
        {/* ── Welcome + Banner ─────────────────────────────── */}
        <section className="mt-5 rounded-3xl overflow-hidden bg-primary-600 text-white shadow-card-hover relative animate-in">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-gold-400/20" aria-hidden="true" />
          <div className="absolute right-16 -bottom-16 w-36 h-36 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative p-5 sm:p-7">
            <p className="text-sm text-white/75 font-medium">{greeting}, {firstName} 👋</p>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
              Welcome to {communityName}
            </h1>

            {banner ? (
              <div className="mt-4 bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-gold-400 text-primary-950 px-2 py-0.5 rounded-full">
                      Announcement
                    </span>
                    <h2 className="text-sm font-semibold mt-2 leading-snug">{banner.title}</h2>
                    <p className="text-xs text-white/70 mt-1 line-clamp-2">{banner.content}</p>
                  </div>
                </div>
                <Link
                  to="/app/community"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 hover:text-gold-200 transition-colors"
                >
                  Read more
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="mt-4 bg-white/12 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                <p className="text-xs text-white/80 leading-relaxed">
                  Discover trusted members, local marketplace deals and community projects — all in one place.
                </p>
                <Link
                  to="/app/marketplace"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-gold-300 hover:text-gold-200 transition-colors"
                >
                  Explore marketplace
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── Quick access modules ─────────────────────────── */}
        <section className="mt-6 bg-white rounded-3xl border border-line shadow-card p-4 animate-in" aria-label="Quick access">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-3">
            {MODULES.map((m) => (
              <Link
                key={m.label}
                to={m.href}
                className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl hover:bg-surface active:scale-95 transition-all group"
              >
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-0.5 ${m.tint}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    {m.icon}
                  </svg>
                </span>
                <span className="text-[11px] font-semibold text-ink text-center leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Content sections ─────────────────────────────── */}
        {loading && (
          <div className="mt-6 bg-white rounded-3xl border border-line p-5">
            <LoadingSkeleton rows={4} />
          </div>
        )}

        {!loading && (
          <div className="mt-6 space-y-6">
            {/* Community announcements */}
            {publishedAnnouncements.length > 0 && (
              <Section title="Community Announcements" href="/app/community">
                <div className="space-y-3">
                  {publishedAnnouncements.slice(0, 3).map((a) => (
                    <div key={a.id} className="bg-white rounded-2xl p-4 border border-line shadow-card hover:shadow-card-hover transition-shadow">
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center flex-shrink-0">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-ink">{a.title}</h4>
                          <p className="text-xs text-muted mt-1 line-clamp-2">{a.content}</p>
                          <p className="text-[10px] text-muted/70 mt-2">
                            {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Featured products */}
            {(products || []).length > 0 && (
              <Section title="Featured Products" href="/app/marketplace">
                <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                  {(products || []).slice(0, 8).map((p) => (
                    <Link
                      key={p.id}
                      to={`/app/products/${p.id}`}
                      className="flex-shrink-0 w-36 bg-white rounded-2xl border border-line shadow-card overflow-hidden hover:shadow-card-hover transition-all group"
                    >
                      <div className="h-28 bg-surface flex items-center justify-center overflow-hidden">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <svg className="h-8 w-8 text-muted/50" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-ink truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-sm font-bold text-primary-600">₹{p.salePrice || p.price}</span>
                          {p.salePrice && <span className="text-[10px] text-muted line-through">₹{p.price}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Kameti groups */}
            {activeKameti.length > 0 && (
              <Section title="Kameti Groups" href="/app/kameti">
                <div className="space-y-3">
                  {activeKameti.slice(0, 3).map((k) => {
                    const current = Number(k.currentMembers || 0);
                    const total = Number(k.totalMembers || 0);
                    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
                    return (
                      <Link
                        key={k.id}
                        to={`/app/kameti/${k.id}`}
                        className="flex items-center justify-between bg-white rounded-2xl p-4 border border-line shadow-card hover:shadow-card-hover transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            K
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-ink truncate">{k.name}</h4>
                            <p className="text-xs text-muted mt-0.5">
                              ₹{k.contributionAmount} · {k.frequency.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-primary-600 font-bold">{current}</span>
                            <span className="text-xs text-muted">/ {total}</span>
                          </div>
                          <div className="w-20 h-1.5 bg-line rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted mt-1">members</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Charity campaigns */}
            {donationProjects.length > 0 && (
              <Section title="Charity Campaigns" href="/app/projects">
                <div className="space-y-3">
                  {donationProjects.slice(0, 3).map((proj) => {
                    const raised = parseFloat(proj.raisedAmount || '0');
                    const goal = parseFloat(proj.goalAmount || '1');
                    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                    return (
                      <Link key={proj.id} to="/app/projects" className="block bg-white rounded-2xl p-4 border border-line shadow-card hover:shadow-card-hover transition-all">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <h4 className="text-sm font-semibold text-ink">{proj.title}</h4>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 flex-shrink-0">
                            Sadaqah
                          </span>
                        </div>
                        <div className="h-2 bg-line rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1.5">
                          <span className="text-[10px] text-muted">₹{raised.toLocaleString('en-IN')} raised</span>
                          <span className="text-[10px] text-primary-600 font-semibold">{pct}%</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Recent orders */}
            {(orders || []).length > 0 && (
              <Section title="Recent Orders" href="/app/orders">
                <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line">
                  {(orders || []).slice(0, 3).map((o) => (
                    <Link key={o.id} to={`/app/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-surface transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">#{o.orderNumber}</p>
                        <p className="text-xs text-muted mt-0.5">
                          ₹{o.total} · {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <OrderStatusBadge status={o.orderStatus} />
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Services */}
            {activeServices.length > 0 && (
              <Section title="Local Services" href="/app/services">
                <div className="space-y-3">
                  {activeServices.slice(0, 3).map((s) => (
                    <Link key={s.id} to="/app/services" className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-line shadow-card hover:shadow-card-hover transition-all group">
                      <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17 21M11.42 15.17V9.83m0 0L6.32 4.75m5.1 5.1l5.1-5.1M6.32 4.75h11.36" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-ink truncate">{s.title}</h4>
                        <p className="text-xs text-muted">{s.providerName || 'Provider'} · {s.price ? `₹${s.price}` : 'Free'}</p>
                      </div>
                      <svg className="h-4 w-4 text-muted group-hover:text-primary-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* Everything empty */}
            {publishedAnnouncements.length === 0 &&
              (products || []).length === 0 &&
              activeKameti.length === 0 &&
              donationProjects.length === 0 &&
              (orders || []).length === 0 &&
              activeServices.length === 0 && (
                <div className="bg-white rounded-3xl border border-line shadow-card">
                  <EmptyStateCard
                    title="Welcome to Barakah"
                    description="Your community hasn't posted anything yet. Explore the marketplace or complete your profile to get started."
                    action={
                      <Link
                        to="/app/marketplace"
                        className="inline-flex px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                      >
                        Explore marketplace
                      </Link>
                    }
                  />
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-ink">{title}</h3>
        <Link
          to={href}
          className="text-xs text-primary-600 font-semibold flex items-center gap-0.5 hover:text-primary-700 transition-colors"
        >
          View all
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
      {children}
    </section>
  );
}
