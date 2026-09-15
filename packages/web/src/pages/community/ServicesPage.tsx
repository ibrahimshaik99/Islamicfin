import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Card, CardContent } from '../../components/ui';
import { StatusBadge } from '../../components/admin/AdminComponents';
import type { ServiceListing, ServiceCategory, ServiceRequest } from '../../lib/types';

export default function ServicesPage() {
  const { communityId } = useAuth();
  const navigate = useNavigate();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<'browse' | 'offer' | 'requests'>('browse');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({ title: '', description: '', price: '', contactName: '', contactPhone: '', location: '', availability: '', categoryId: '' });
  const [requestTarget, setRequestTarget] = useState<{ id: string; title: string } | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mutate, loading: mutating, error: mutationError, resetError } = useMutation();

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const { data: categories } = useApi<ServiceCategory[]>(communityId ? `${prefix}/services/categories` : null);
  const { data: listingsData, loading: listLoad, error: listErr, refetch: refetchList } = useApi<ServiceListing[]>(communityId ? `${prefix}/services/listings` : null);
  const { data: requestsData, loading: reqLoad, error: reqErr, refetch: refetchReq } = useApi<ServiceRequest[]>(communityId ? `${prefix}/services/requests` : null);

  const listings = (listingsData || []).filter((l) =>
    l.status === 'ACTIVE' &&
    (!search || l.title.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())) &&
    (!categoryFilter || l.categoryId === categoryFilter)
  );
  const requests = requestsData || [];

  const handleCreateListing = async () => {
    if (!offerForm.title.trim()) return;
    resetError();
    const result = await mutate(`${prefix}/services/listings`, {
      body: {
        title: offerForm.title.trim(),
        description: offerForm.description.trim() || undefined,
        price: offerForm.price || undefined,
        contactName: offerForm.contactName.trim() || undefined,
        contactPhone: offerForm.contactPhone.trim() || undefined,
        location: offerForm.location.trim() || undefined,
        availability: offerForm.availability.trim() || undefined,
        categoryId: offerForm.categoryId || undefined,
      },
    });
    if (result) {
      setBanner({ type: 'success', message: 'Service listing created.' });
      setOfferForm({ title: '', description: '', price: '', contactName: '', contactPhone: '', location: '', availability: '', categoryId: '' });
      setShowOfferForm(false);
      refetchList();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to create listing.' });
    }
  };

  const handleRequest = async () => {
    if (!requestTarget) return;
    resetError();
    const result = await mutate(`${prefix}/services/requests`, {
      body: { serviceId: requestTarget.id, message: requestDesc.trim() || undefined },
    });
    if (result) {
      setBanner({ type: 'success', message: 'Service request sent.' });
      setRequestTarget(null);
      setRequestDesc('');
      refetchReq();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to send request.' });
    }
  };

  return (
    <DashboardLayout title="Services" navItems={communityNav} navTitle="Community">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {banner && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${banner.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {banner.type === 'success' ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            )}
            <span>{banner.message}</span>
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg max-w-md">
            <button onClick={() => setTab('browse')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === 'browse' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>I Need a Service</button>
            <button onClick={() => setTab('offer')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === 'offer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>I Offer a Service</button>
            <button onClick={() => setTab('requests')} className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${tab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>My Requests</button>
          </div>
          <button onClick={() => { refetchList(); refetchReq(); setLastRefresh(new Date()); }} className="text-xs text-teal-600 hover:text-teal-700">Refresh</button>
        </div>

        {tab === 'browse' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-slate-200 rounded-2xl px-3 py-2 bg-white">
                <option value="">All Categories</option>
                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {listLoad && <LoadingState />}
            {listErr && <ErrorState message={listErr} onRetry={refetchList} />}
            {!listLoad && !listErr && listings.length === 0 && (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m5.1 5.1L17 21M11.42 15.17V9.83m0 0L6.32 4.75m5.1 5.1l5.1-5.1M6.32 4.75h11.36M6.32 4.75v0" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No services available matching your search.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((s) => (
                <Card key={s.id}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">{s.title}</h3>
                      <span className="text-sm font-bold text-teal-600">₹{s.price || 'Free'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">by {s.providerName}</p>
                    {s.description && <p className="text-xs text-slate-600 line-clamp-2 mb-2">{s.description}</p>}
                    {s.contactName && <p className="text-xs text-slate-500 mb-1">👤 {s.contactName}</p>}
                    {s.contactPhone && <p className="text-xs text-slate-500 mb-1">📞 {s.contactPhone}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3">
                      {s.location && <span>📍 {s.location}</span>}
                      {s.availability && <span>🕐 {s.availability}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setRequestTarget({ id: s.id, title: s.title })} className="flex-1" variant="secondary">Request</Button>
                      {s.contactPhone && (
                        <a href={`tel:${s.contactPhone}`} className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Call provider">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                        </a>
                      )}
                      <button onClick={async () => {
                        if (!communityId) return;
                        try {
                          const res = await fetch(`/api/v1/communities/${communityId}/conversations`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'DIRECT', memberIds: [s.providerId] }),
                          });
                          const result = await res.json();
                          if (result.data?.id) navigate(`/community/messages?conversationId=${result.data.id}`);
                          else navigate('/community/messages');
                        } catch { navigate('/community/messages'); }
                      }} className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Chat with provider">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === 'offer' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Your Service Listings</h2>
              <Button onClick={() => setShowOfferForm(!showOfferForm)}>{showOfferForm ? 'Cancel' : 'List a Service'}</Button>
            </div>
            {showOfferForm && (
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <input value={offerForm.title} onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="Service title (e.g. Plumbing repair, Tutoring)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    <textarea value={offerForm.description} onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })} rows={2} placeholder="Describe your service" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <input value={offerForm.contactName} onChange={(e) => setOfferForm({ ...offerForm, contactName: e.target.value })} placeholder="Your name" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                      <input value={offerForm.contactPhone} onChange={(e) => setOfferForm({ ...offerForm, contactPhone: e.target.value })} placeholder="Contact phone number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input value={offerForm.price} onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })} placeholder="Price (₹, 0 for free)" type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <select value={offerForm.categoryId} onChange={(e) => setOfferForm({ ...offerForm, categoryId: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white">
                        <option value="">Select category...</option>
                        {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input value={offerForm.location} onChange={(e) => setOfferForm({ ...offerForm, location: e.target.value })} placeholder="Location / area" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <input value={offerForm.availability} onChange={(e) => setOfferForm({ ...offerForm, availability: e.target.value })} placeholder="Availability (e.g. Weekdays 9-5)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                    <div className="flex justify-end"><Button onClick={handleCreateListing} loading={mutating}>Publish Listing</Button></div>
                  </div>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Your Listings</h3>
                {(listingsData || []).length === 0 ? <p className="text-sm text-slate-500">No listings yet.</p> : (
                  <div className="space-y-2">
                    {(listingsData || []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.title}</p>
                          <p className="text-xs text-slate-500">₹{s.price || 'Free'} · {s.contactPhone || 'No phone'} · {s.location || 'No location'}</p>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'requests' && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Your Service Requests</h3>
              {reqLoad && <LoadingState />}
              {reqErr && <ErrorState message={reqErr} onRetry={refetchReq} />}
              {!reqLoad && !reqErr && requests.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Request #{r.id.slice(0, 8)}</p>
                      {r.description && <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>}
                      <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center"><span className="text-[10px] text-slate-400">Updated {lastRefresh.toLocaleTimeString()}</span></div>

        {requestTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Request Service</h3>
              <p className="text-sm text-slate-500 mb-4">{requestTarget.title}</p>
              <textarea value={requestDesc} onChange={(e) => setRequestDesc(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Describe what you need..." />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setRequestTarget(null); setRequestDesc(''); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">Cancel</button>
                <button onClick={handleRequest} disabled={mutating} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-2xl hover:bg-teal-700 disabled:opacity-50">
                  {mutating ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
