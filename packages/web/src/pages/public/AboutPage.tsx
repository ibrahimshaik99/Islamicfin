import { Link } from 'react-router-dom';

export default function AboutPage() {
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
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">About the Platform</h1>
        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            The Islamic Community Platform is a trusted technology solution designed specifically
            for Islamic community centers and their members in India.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            We provide tools for community management, marketplace, services, and Shariah-compliant
            financial operations — all under one roof, with multi-tenant isolation ensuring each
            community&apos;s data remains private and secure.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            Our platform supports Kameti, Sadaqah, Qard Hasan, Mudarabah, Musharakah, and other
            Islamic financial contract types with proper documentation, party identification, and
            Shariah review status tracking.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Security is foundational — not an afterthought. Every layer is designed to protect
            your community&apos;s data and financial records.
          </p>
        </div>
      </main>
    </div>
  );
}
