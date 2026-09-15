import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInView } from '../hooks/useInView';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Nav user={user} />
      <Hero />
      <Features />
      <HowItWorks />
      <CommunitySection />
      <MerchantSection />
      <FinanceSection />
      <SecuritySection />
      <FinalCTA user={user} />
      <Footer />
    </div>
  );
}

/* ───────── Navigation ───────── */

function Nav({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">ICP</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:inline">Islamic Community Platform</span>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#community" className="hover:text-primary-600 transition-colors">For Communities</a>
            <a href="#merchants" className="hover:text-primary-600 transition-colors">For Merchants</a>
            <a href="#finance" className="hover:text-primary-600 transition-colors">Islamic Finance</a>
            <a href="#security" className="hover:text-primary-600 transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/signin" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
                <Link to="/signup"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ───────── Hero ───────── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-100/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary-50/60 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight slide-up">
            One Platform for <span className="text-primary-600">Stronger Islamic Communities</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed slide-up stagger-1">
            Community management, marketplace, services, Kameti, Sadaqah, Qard Hasan,
            secure messaging, and Shariah-compliant finance — all in one trusted platform.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 slide-up stagger-2">
            <Link to="/signup"
              className="w-full sm:w-auto bg-primary-600 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-200">
              Get Started Free
            </Link>
            <Link to="/signin"
              className="w-full sm:w-auto border border-gray-300 text-gray-700 px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-gray-50 transition-colors">
              Sign In
            </Link>
          </div>
        </div>

        {/* Product Preview */}
        <div className="mt-16 slide-up stagger-3">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

/* ───────── Product Preview ───────── */

function ProductPreview() {
  const items = [
    { label: 'Community Members', value: '2,450', sub: 'Active this month', color: 'bg-primary-100 text-primary-700' },
    { label: 'Kameti Collection', value: '₹1,28,500', sub: 'This quarter', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Sadaqah Raised', value: '₹45,200', sub: '3 projects funded', color: 'bg-amber-100 text-amber-700' },
    { label: 'Marketplace Orders', value: '186', sub: 'This week', color: 'bg-sky-100 text-sky-700' },
  ];

  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-50/20 to-transparent rounded-3xl blur-2xl" />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Fake browser bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-white rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-400">
              app.icp.community/dashboard
            </div>
          </div>
        </div>

        {/* Fake dashboard content */}
        <div className="p-6 bg-gray-50/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Al-Noor Community Center</h3>
              <p className="text-xs text-gray-500">Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 bg-primary-500 rounded-full" />
                Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.label} className={`rounded-xl p-4 ${item.color.split(' ')[0]}`}>
                <p className={`text-xs font-medium ${item.color.split(' ')[1]} opacity-80`}>{item.label}</p>
                <p className={`text-xl font-bold mt-1 ${item.color.split(' ')[1]}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Recent Activity</p>
              <div className="space-y-2">
                {[
                  'Ahmad contributed ₹2,000 to Kameti',
                  'Fatima listed 3 new products',
                  'Hassan paid Zakat of ₹5,000',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Sadaqah Projects</p>
              <div className="space-y-2">
                {[
                  { name: 'Water Well Fund', pct: 72 },
                  { name: 'Orphan Education', pct: 45 },
                  { name: 'Masjid Renovation', pct: 88 },
                ].map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{p.name}</span>
                      <span>{p.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Features ───────── */

function Features() {
  const features = [
    {
      icon: <UsersIcon />,
      title: 'Community Management',
      desc: 'Manage members, roles, groups, announcements, and events. Build a connected community with tools designed for Islamic centers.',
    },
    {
      icon: <StoreIcon />,
      title: 'Marketplace',
      desc: 'Merchants list products, community members shop locally. Supports inventory, orders, payments, and delivery tracking.',
    },
    {
      icon: <BriefcaseIcon />,
      title: 'Jobs & Services',
      desc: 'Service providers list offerings, members discover and book. From tutoring to tailoring, support your community economy.',
    },
    {
      icon: <GroupIcon />,
      title: 'Kameti',
      desc: 'Run rotating savings groups with transparent tracking. Contributions, payouts, and member history — all automated.',
    },
    {
      icon: <HeartIcon />,
      title: 'Sadaqah',
      desc: 'Donate to community projects with full transparency. Track fund usage, project progress, and impact.',
    },
    {
      icon: <HandIcon />,
      title: 'Qard Hasan',
      desc: 'Interest-free loans between community members. Repayment tracking, eligibility, and documentation — Shariah-compliant.',
    },
    {
      icon: <TrendingIcon />,
      title: 'Crowdfunding',
      desc: 'Community projects through donations or investment. Proper legal and Shariah governance for every campaign.',
    },
    {
      icon: <FinanceIcon />,
      title: 'Islamic Finance',
      desc: 'Mudarabah, Musharakah, Murabahah — manage community finance with contract-specific rules and Shariah review.',
    },
    {
      icon: <CalculatorIcon />,
      title: 'Zakat',
      desc: 'Calculate zakat accurately with a guided tool. Nisab tracking, asset management, and distribution planning.',
    },
    {
      icon: <ChatIcon />,
      title: 'Messaging',
      desc: 'Secure group and direct messaging within the community. Announcements, discussions, and private conversations.',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Features"
          title="Everything your community needs"
          sub="A complete platform replacing multiple tools. Manage, connect, trade, and finance — all under one roof."
        />
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-primary-100 transition-all duration-300 ${
        inView ? 'slide-up' : 'opacity-0'
      }`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}

/* ───────── How It Works ───────── */

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Create Your Community', desc: 'Sign up and set up your community center in minutes. Invite members, set roles, and configure settings.' },
    { num: '02', title: 'Onboard Members & Merchants', desc: 'Members join with their community. Merchants list products and services. Everyone finds their place.' },
    { num: '03', title: 'Manage & Grow', desc: 'Run Kameti, accept Sadaqah, facilitate Qard Hasan, manage marketplace — all with transparent tracking.' },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="How It Works"
          title="Up and running in three steps"
          sub="No complex setup. Start connecting your community today."
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <StepCard key={s.num} step={s} index={i} isLast={i < steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index, isLast }: { step: { num: string; title: string; desc: string }; index: number; isLast: boolean }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`relative ${inView ? 'slide-up' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <div className="text-5xl font-black text-primary-100">{step.num}</div>
      <h3 className="mt-3 text-lg font-semibold text-gray-900">{step.title}</h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.desc}</p>
      {isLast && (
        <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-primary-200" />
      )}
    </div>
  );
}

/* ───────── Community Section ───────── */

function CommunitySection() {
  const { ref, inView } = useInView();
  return (
    <section id="community" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${inView ? 'slide-up' : 'opacity-0'}`}>
          <div>
            <span className="inline-block bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">For Communities</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Bring your community together
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              From masjid committees to neighborhood associations, manage members, groups,
              events, announcements, and finances — all in one trusted place.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Role-based access: Owner, Admin, Moderator, Member',
                'Announcements and event management',
                'Secure group and direct messaging',
                'Financial transparency with audit trails',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckIcon className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-3xl p-8 border border-primary-100">
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <UsersIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Al-Noor Community</p>
                    <p className="text-xs text-gray-500">2,450 members</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { n: '12', l: 'Groups' },
                    { n: '340', l: 'Events' },
                    { n: '89', l: 'Announcements' },
                    { n: '₹8.2L', l: 'Managed' },
                  ].map((s) => (
                    <div key={s.l} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-gray-900">{s.n}</p>
                      <p className="text-xs text-gray-500">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Merchant Section ───────── */

function MerchantSection() {
  const { ref, inView } = useInView();
  return (
    <section id="merchants" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${inView ? 'slide-in-right' : 'opacity-0'}`}>
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-900">Merchant Dashboard</p>
                <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { v: '₹24,500', l: 'Revenue' },
                  { v: '86', l: 'Orders' },
                  { v: '23', l: 'Products' },
                ].map((s) => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-900">{s.v}</p>
                    <p className="text-xs text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {['Thobe - Premium', 'Prayer Mat - Silk', 'Tasbeeh - Wooden'].map((p) => (
                  <div key={p} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{p}</span>
                    <span className="text-xs text-primary-600 font-medium">In Stock</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-block bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">For Merchants</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Reach your community directly
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              List products and services, manage orders, and connect with community members
              who trust and support local businesses.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Product catalog with inventory tracking',
                'Order management and status updates',
                'Community member reviews and trust signals',
                'Direct messaging with customers',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckIcon className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Finance Section ───────── */

function FinanceSection() {
  const contracts = [
    { name: 'Kameti', desc: 'Rotating savings groups with transparent tracking', icon: <GroupIcon /> },
    { name: 'Sadaqah', desc: 'Voluntary donations to community projects', icon: <HeartIcon /> },
    { name: 'Qard Hasan', desc: 'Interest-free loans with repayment tracking', icon: <HandIcon /> },
    { name: 'Mudarabah', desc: 'Profit-sharing partnerships under contract', icon: <TrendingIcon /> },
    { name: 'Musharakah', desc: 'Joint venture partnerships with shared risk', icon: <FinanceIcon /> },
    { name: 'Zakat', desc: 'Accurate calculation and distribution', icon: <CalculatorIcon /> },
  ];

  const { ref, inView } = useInView();
  return (
    <section id="finance" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Islamic Finance"
          title="Shariah-compliant financial tools"
          sub="Every contract type is modeled accurately. No renaming conventional products. Proper review and documentation."
        />
        <div ref={ref} className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.map((c, i) => (
            <div
              key={c.name}
              className={`group bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 p-6 hover:border-primary-200 hover:shadow-md transition-all duration-300 ${
                inView ? 'slide-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
                {c.icon}
              </div>
              <h3 className="mt-3 text-base font-semibold text-gray-900">{c.name}</h3>
              <p className="mt-1.5 text-sm text-gray-600">{c.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-400">
          All finance features include contract documentation, party identification, Shariah review status, and audit trails.
        </p>
      </div>
    </section>
  );
}

/* ───────── Security Section ───────── */

function SecuritySection() {
  const { ref, inView } = useInView();
  const items = [
    { title: 'Multi-Tenant Isolation', desc: 'Each community\'s data is completely isolated. No cross-tenant access, ever.' },
    { title: 'Encrypted Storage', desc: 'Passwords hashed with PBKDF2. Sensitive data encrypted at rest and in transit.' },
    { title: 'Server-Side Authorization', desc: 'Every protected operation verified server-side. No client-side role trust.' },
    { title: 'Audit Trails', desc: 'Financial records are immutable. Corrections use reversal records, not deletions.' },
    { title: 'Session Security', desc: 'HttpOnly, Secure, SameSite cookies with automatic expiry and rotation.' },
    { title: 'Rate Limiting', desc: 'API rate limiting prevents abuse and ensures fair usage across communities.' },
  ];

  return (
    <section id="security" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Security & Privacy"
          title="Built to be trustworthy"
          sub="Security is not a feature — it is the foundation. Every layer is designed to protect your community."
        />
        <div ref={ref} className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={item.title}
              className={`bg-white rounded-2xl border border-gray-100 p-6 ${inView ? 'slide-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                <ShieldIcon />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Final CTA ───────── */

function FinalCTA({ user }: { user: ReturnType<typeof useAuth>['user'] }) {
  const { ref, inView } = useInView();
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div ref={ref} className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${inView ? 'slide-up' : 'opacity-0'}`}>
        <div className="relative bg-primary-600 rounded-3xl overflow-hidden px-6 py-16 sm:px-12 sm:py-20 text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary-500/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary-700/30 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Ready to strengthen your community?
            </h2>
            <p className="mt-4 text-primary-100 text-lg max-w-2xl mx-auto">
              Join communities across India already using the platform to manage finances,
              connect members, and grow together.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {!user && (
                <Link to="/signup"
                  className="w-full sm:w-auto bg-white text-primary-700 px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-50 transition-colors shadow-lg">
                  Get Started Free
                </Link>
              )}
              <Link to="/signin"
                className="w-full sm:w-auto border border-primary-300 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-primary-700 transition-colors">
                {user ? 'Go to Dashboard' : 'Sign In'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Footer ───────── */

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">ICP</span>
              </div>
              <span className="font-bold text-white text-sm">ICP</span>
            </div>
            <p className="text-sm leading-relaxed">
              A trusted platform for Islamic communities in India.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#finance" className="hover:text-white transition-colors">Islamic Finance</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">For</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#community" className="hover:text-white transition-colors">Communities</a></li>
              <li><a href="#merchants" className="hover:text-white transition-colors">Merchants</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Members</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Shariah Policy</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-sm">
          Islamic Community Platform — Built for Indian Islamic Communities
        </div>
      </div>
    </footer>
  );
}

/* ───────── Shared Components ───────── */

function SectionHeading({ badge, title, sub }: { badge: string; title: string; sub: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={`text-center max-w-2xl mx-auto ${inView ? 'slide-up' : 'opacity-0'}`}>
      <span className="inline-block bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">{badge}</span>
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      <p className="mt-3 text-gray-600">{sub}</p>
    </div>
  );
}

/* ───────── Icons ───────── */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0v7.5a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75v-7.5" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075-5.925a1.575 1.575 0 013.15 0v1.5m-3.15-1.5v5.925m3.15-5.925a1.575 1.575 0 013.15 0v5.925m-3.15 0l.075 5.925m3.075-5.925a1.575 1.575 0 013.15 0v5.925m-3.15 0l.075 5.925M3.375 21h.008v.008H3.375v-.008zm16.5 0h.008v.008H19.875v-.008zM3.375 3h.008v.008H3.375V3zm16.5 0h.008v.008H19.875V3z" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}

function FinanceIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25v-.008zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007v-.008zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.671 1.09-.085 2.17-.207 3.238-.364 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
