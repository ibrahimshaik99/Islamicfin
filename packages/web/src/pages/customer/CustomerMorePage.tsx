import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * "More" — the full directory of customer destinations.
 * Every entry maps to an existing route; nothing here is decorative.
 */

interface Item {
  label: string;
  href: string;
  desc: string;
  icon: ReactNode;
  tint?: string;
}

const ic = (d: string) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const sections: { title: string; items: Item[] }[] = [
  {
    title: 'Discover',
    items: [
      {
        label: 'Marketplace',
        href: '/app/marketplace',
        desc: 'Buy and sell with your community',
        icon: ic('M13.5 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z'),
        tint: 'bg-primary-50 text-primary-600',
      },
      {
        label: 'Services',
        href: '/app/services',
        desc: 'Find or offer local services',
        icon: ic('M11.42 15.17l-5.1-5.1m5.1 5.1L17 21M11.42 15.17V9.83m0 0L6.32 4.75m5.1 5.1l5.1-5.1M6.32 4.75h11.36'),
        tint: 'bg-sky-50 text-sky-600',
      },
      {
        label: 'My Orders',
        href: '/app/orders',
        desc: 'Track and manage your orders',
        icon: ic('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z'),
        tint: 'bg-slate-100 text-slate-600',
      },
    ],
  },
  {
    title: 'Community',
    items: [
      {
        label: 'Community Hub',
        href: '/app/community',
        desc: 'Announcements, groups and members',
        icon: ic('M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'),
        tint: 'bg-emerald-50 text-emerald-600',
      },
      {
        label: 'Messages',
        href: '/app/messages',
        desc: 'Conversations with your community',
        icon: ic('M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z'),
        tint: 'bg-indigo-50 text-indigo-600',
      },
    ],
  },
  {
    title: 'Finance & Giving',
    items: [
      {
        label: 'Kameti',
        href: '/app/kameti',
        desc: 'Community savings circles',
        icon: ic('M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z'),
        tint: 'bg-gold-50 text-gold-600',
      },
      {
        label: 'Zakat Calculator',
        href: '/app/zakat',
        desc: 'Estimate your Zakat obligation',
        icon: ic('M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'),
        tint: 'bg-amber-50 text-amber-600',
      },
      {
        label: 'Sadaqah',
        href: '/app/sadaqah',
        desc: 'Voluntary charity projects',
        icon: ic('M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'),
        tint: 'bg-rose-50 text-rose-600',
      },
      {
        label: 'Crowdfunding',
        href: '/app/projects',
        desc: 'Donation and community projects',
        icon: ic('M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
        tint: 'bg-cyan-50 text-cyan-600',
      },
      {
        label: 'Islamic Finance',
        href: '/app/finance',
        desc: 'Qard Hasan, Mudarabah, and more',
        icon: ic('M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
        tint: 'bg-violet-50 text-violet-600',
      },
      {
        label: 'My Installments',
        href: '/app/bnpl',
        desc: 'Deferred payment plans',
        icon: ic('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 0h3.75m6 0h1.5m-1.5 0h-1.5m-6 0h3m-3 0h3m-6 0h6M6 21h12a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018 4.5H6a2.25 2.25 0 00-2.25 2.25v12A2.25 2.25 0 006 21z'),
        tint: 'bg-lime-50 text-lime-700',
      },
      {
        label: 'Finance Requests',
        href: '/app/finance-requests',
        desc: 'Track your finance requests',
        icon: ic('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'),
        tint: 'bg-teal-50 text-teal-600',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Profile',
        href: '/app/profile',
        desc: 'Your account information',
        icon: ic('M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'),
        tint: 'bg-gray-100 text-gray-600',
      },
    ],
  },
];

export default function CustomerMorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-white border-b border-line sticky top-0 z-30 safe-top">
        <div className="max-w-3xl mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="touch-target -ml-2 flex items-center justify-center rounded-xl hover:bg-surface transition-colors"
          >
            <svg className="h-5 w-5 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-ink ml-1">More</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6 pb-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">{section.title}</h2>
            <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
              {section.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 hover:bg-surface transition-colors touch-target"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.tint || 'bg-primary-50 text-primary-600'}`}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left min-w-0">
                    <span className="text-sm font-semibold text-ink block">{item.label}</span>
                    <span className="text-xs text-muted block truncate">{item.desc}</span>
                  </span>
                  <svg className="h-4 w-4 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
