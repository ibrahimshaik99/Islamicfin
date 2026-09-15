import { Link } from 'react-router-dom';

const features = [
  { title: 'Community Management', desc: 'Manage members, roles, groups, announcements, and events.' },
  { title: 'Marketplace', desc: 'Merchants list products, members shop locally with trust.' },
  { title: 'Jobs & Services', desc: 'Service providers list offerings, members discover and book.' },
  { title: 'Kameti', desc: 'Rotating savings groups with transparent tracking.' },
  { title: 'Sadaqah', desc: 'Donate to community projects with full transparency.' },
  { title: 'Qard Hasan', desc: 'Interest-free loans between community members.' },
  { title: 'Crowdfunding', desc: 'Community projects through donations or investment.' },
  { title: 'Islamic Finance', desc: 'Mudarabah, Musharakah, Murabahah — Shariah-compliant tools.' },
  { title: 'Zakat', desc: 'Calculate zakat accurately with a guided tool.' },
  { title: 'Messaging', desc: 'Secure group and direct messaging within the community.' },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">ICP</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:inline">Islamic Community Platform</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/signin" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link to="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">Get Started</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">Platform Features</h1>
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto mb-12">
          Everything your Islamic community needs — from management to finance.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
