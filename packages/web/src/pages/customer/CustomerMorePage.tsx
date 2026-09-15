import { useNavigate } from 'react-router-dom';

export default function CustomerMorePage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Community',
      items: [
        { label: 'Services', href: '/app/services', icon: '🔧', desc: 'Find or offer services' },
        { label: 'Messages', href: '/app/messages', icon: '💬', desc: 'Conversations with your community' },
      ],
    },
    {
      title: 'Finance & Giving',
      items: [
        { label: 'Zakat Calculator', href: '/app/zakat', icon: '🕌', desc: 'Estimate your Zakat obligation' },
        { label: 'Sadaqah', href: '/app/sadaqah', icon: '❤️', desc: 'Voluntary charity projects' },
        { label: 'Islamic Finance', href: '/app/finance', icon: '🏦', desc: 'Qard Hasan, Mudarabah, and more' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', href: '/app/profile', icon: '👤', desc: 'Your account information' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-900 ml-2">More</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {section.items.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 touch-target"
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 text-left">
                    <span className="text-sm text-gray-900 block">{item.label}</span>
                    {item.desc && <span className="text-[10px] text-gray-400">{item.desc}</span>}
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
