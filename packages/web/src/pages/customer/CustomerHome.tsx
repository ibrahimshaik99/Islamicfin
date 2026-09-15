import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState } from '../../components/ui';
import type { Announcement, KametiGroup, CrowdfundingProject, Product, ServiceListing } from '../../lib/types';

export default function CustomerHome() {
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');

  const { data: announcements, loading: aLoad } = useApi<Announcement[]>(
    communityId ? `${prefix}/announcements` : null,
  );
  const { data: products, loading: pLoad } = useApi<Product[]>(
    communityId ? `${prefix}/products?limit=6` : null,
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

  const loading = aLoad || pLoad || kLoad || prLoad || sLoad;
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      {/* Gradient Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 text-white safe-top animate-in fade-in">
        <div className="px-4 pt-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-white/70 font-medium">{greeting}</p>
              <h1 className="text-2xl font-bold mt-0.5 tracking-tight">{user?.name || 'Welcome'}</h1>
            </div>
            <Link to="/app/profile" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
              <span className="text-sm font-bold">{user?.name?.charAt(0) || '?'}</span>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, services, groups..."
              className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white/15 backdrop-blur-sm text-white placeholder-white/50 outline-none focus:bg-white/25 border border-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}

      {!loading && (
        <div className="px-4 space-y-6 -mt-3 pb-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-4 gap-3">
              <QuickAction icon="🛒" label="Shop" href="/app/marketplace" color="from-orange-400 to-amber-500" />
              <QuickAction icon="💰" label="Zakat" href="/app/zakat" color="from-emerald-400 to-teal-500" />
              <QuickAction icon="🏦" label="Kameti" href="/app/kameti" color="from-blue-400 to-indigo-500" />
              <QuickAction icon="❤️" label="Sadaqah" href="/app/sadaqah" color="from-rose-400 to-pink-500" />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <QuickAction icon="🏛️" label="Finance" href="/app/finance" color="from-violet-400 to-purple-500" />
              <QuickAction icon="🔧" label="Services" href="/app/services" color="from-cyan-400 to-sky-500" />
              <QuickAction icon="💬" label="Chat" href="/app/messages" color="from-teal-400 to-emerald-500" />
              <QuickAction icon="📋" label="Orders" href="/app/orders" color="from-slate-400 to-gray-500" />
            </div>
          </div>

          {/* Announcements */}
          {(announcements || []).length > 0 && (
            <Section title="Announcements" href="/app/more" delay="animate-in fade-in slide-in-from-bottom-4 delay-100">
              {(announcements || []).slice(0, 3).map((a) => (
                <div key={a.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{a.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                      <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Featured Products */}
          {(products || []).length > 0 && (
            <Section title="Marketplace" href="/app/marketplace" delay="animate-in fade-in slide-in-from-bottom-4 delay-200">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
                {(products || []).slice(0, 6).map((p, i) => (
                  <Link key={p.id} to={`/app/products/${p.id}`} className="flex-shrink-0 w-36 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center overflow-hidden">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm font-bold text-primary-600">₹{p.salePrice || p.price}</span>
                        {p.salePrice && <span className="text-[10px] text-gray-400 line-through">₹{p.price}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Active Kameti */}
          {(kameti || []).filter((k) => k.status === 'ACTIVE').length > 0 && (
            <Section title="Kameti Groups" href="/app/kameti" delay="animate-in fade-in slide-in-from-bottom-4 delay-300">
              {(kameti || []).filter((k) => k.status === 'ACTIVE').slice(0, 3).map((k) => (
                <Link key={k.id} to={`/app/kameti/${k.id}`} className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <span className="text-white text-sm font-bold">K</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{k.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">₹{k.contributionAmount} / {k.frequency.toLowerCase()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-600 font-semibold">{k.currentMembers}</span>
                      <span className="text-xs text-gray-400">/</span>
                      <span className="text-xs text-gray-400">{k.totalMembers}</span>
                    </div>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: `${k.totalMembers > 0 ? Math.round((k.currentMembers / k.totalMembers) * 100) : 0}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </Section>
          )}

          {/* Crowdfunding Projects */}
          {(projects || []).length > 0 && (
            <Section title="Projects" href="/app/projects" delay="animate-in fade-in slide-in-from-bottom-4 delay-400">
              {(projects || []).slice(0, 3).map((proj) => {
                const raised = parseFloat(proj.raisedAmount || '0');
                const goal = parseFloat(proj.goalAmount || '1');
                const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;
                const isInvestment = proj.projectType === 'INVESTMENT';
                return (
                  <Link key={proj.id} to="/app/projects" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{proj.title}</h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isInvestment ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {proj.projectType}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-gray-500">₹{raised.toLocaleString('en-IN')} raised</span>
                      <span className="text-[10px] text-primary-600 font-medium">{pct}%</span>
                    </div>
                  </Link>
                );
              })}
            </Section>
          )}

          {/* Services */}
          {(services || []).length > 0 && (
            <Section title="Services" href="/app/services" delay="animate-in fade-in slide-in-from-bottom-4 delay-500">
              {(services || []).slice(0, 3).map((s) => (
                <Link key={s.id} to="/app/services" className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17 21M11.42 15.17V9.83m0 0L6.32 4.75m5.1 5.1l5.1-5.1M6.32 4.75h11.36M6.32 4.75v0" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{s.title}</h4>
                    <p className="text-xs text-gray-500">{s.providerName || 'Provider'} · {s.price ? `₹${s.price}` : 'Free'}</p>
                  </div>
                  <svg className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function QuickAction({ icon, label, href, color }: { icon: string; label: string; href: string; color: string }) {
  return (
    <Link to={href} className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
        <span className="text-xl">{icon}</span>
      </div>
      <span className="text-[11px] font-medium text-gray-700">{label}</span>
    </Link>
  );
}

function Section({ title, href, children, delay = '' }: { title: string; href: string; children: React.ReactNode; delay?: string }) {
  return (
    <div className={delay}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <Link to={href} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5 hover:text-primary-700 transition-colors">
          View all
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
