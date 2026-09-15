import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { api } from '../../lib/api';
import { LoadingState, ErrorState } from '../../components/ui';
import type { ServiceListing, ServiceCategory, ServiceRequest } from '../../lib/types';

export default function CustomerServicesPage() {
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<'browse' | 'requests' | 'my'>('browse');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [requestTarget, setRequestTarget] = useState<{ id: string; title: string } | null>(null);
  const [requestDesc, setRequestDesc] = useState('');
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [newListing, setNewListing] = useState({ title: '', description: '', price: '', contactName: '', contactPhone: '', location: '', availability: '', categoryId: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const { mutate, loading: mutating } = useMutation();

  const { data: categories } = useApi<ServiceCategory[]>(
    communityId ? `${prefix}/services/categories` : null,
  );

  const { data: listingsData, loading: listLoad, error: listErr, refetch: refetchListings } = useApi<ServiceListing[]>(
    communityId ? `${prefix}/services/listings` : null,
  );

  const { data: requestsData, loading: reqLoad, error: reqErr } = useApi<ServiceRequest[]>(
    communityId ? `${prefix}/services/requests` : null,
  );

  const listings = (listingsData || []).filter((l) =>
    l.status === 'ACTIVE' &&
    (!search || l.title.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())) &&
    (!categoryFilter || l.categoryId === categoryFilter)
  );

  const myListings = (listingsData || []).filter((l) => l.providerId === user?.id);
  const requests = requestsData || [];

  const handleRequest = async () => {
    if (!requestTarget) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/services/requests`, {
        body: { serviceId: requestTarget.id, description: requestDesc.trim() || undefined },
      });
      setRequestTarget(null);
      setRequestDesc('');
    } catch {
      setActionError('Failed to send service request. Please try again.');
    }
  };

  const handleCreateListing = async () => {
    if (!newListing.title.trim()) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/services/listings`, {
        body: {
          title: newListing.title.trim(),
          description: newListing.description.trim() || undefined,
          price: newListing.price || undefined,
          contactName: newListing.contactName.trim() || undefined,
          contactPhone: newListing.contactPhone.trim() || undefined,
          location: newListing.location.trim() || undefined,
          availability: newListing.availability.trim() || undefined,
          categoryId: newListing.categoryId || undefined,
        },
      });
      setShowCreateListing(false);
      setNewListing({ title: '', description: '', price: '', contactName: '', contactPhone: '', location: '', availability: '', categoryId: '' });
      refetchListings();
    } catch {
      setActionError('Failed to create listing. Please try again.');
    }
  };

  const handleStartChat = async (providerId: string) => {
    if (!communityId) return;
    setChatLoading(providerId);
    try {
      const conversations = await api<{ data: { id: string; type: string }[] }>(`${prefix}/conversations`);
      const existing = conversations.data?.find(
        (c) => c.type === 'DIRECT' && (c as any).memberIds?.includes(providerId)
      );
      if (existing) {
        navigate(`/app/messages?conversationId=${existing.id}`);
        return;
      }
      const conv = await api<{ data: { id: string } }>(`${prefix}/conversations`, {
        method: 'POST',
        body: { type: 'DIRECT', memberIds: [user?.id, providerId] },
      });
      navigate(`/app/messages?conversationId=${conv.data.id}`);
    } catch {
      setActionError('Failed to start chat. Please try again.');
    } finally {
      setChatLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/20">
      <div className="bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Services</h1>
          <button onClick={() => setShowCreateListing(true)} className="ml-auto touch-target flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 animate-in fade-in">
          <button onClick={() => setTab('browse')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${tab === 'browse' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm' : 'text-gray-500'}`}>Browse</button>
          <button onClick={() => setTab('requests')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${tab === 'requests' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm' : 'text-gray-500'}`}>My Requests ({requests.length})</button>
          <button onClick={() => setTab('my')} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${tab === 'my' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-sm' : 'text-gray-500'}`}>My Services ({myListings.length})</button>
        </div>

        {/* Browse */}
        {tab === 'browse' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none bg-white shadow-sm" />
            </div>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
              <button onClick={() => setCategoryFilter('')} className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-full transition-all ${!categoryFilter ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}>All</button>
              {(categories || []).map((c) => (
                <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-full transition-all ${categoryFilter === c.id ? 'bg-cyan-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}>{c.name}</button>
              ))}
            </div>

            {listLoad && <LoadingState />}
            {listErr && <ErrorState message={listErr} />}
            {!listLoad && !listErr && listings.length === 0 && (
              <div className="text-center py-16 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-sky-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔧</span>
                </div>
                <p className="text-base font-semibold text-gray-700">No services available</p>
              </div>
            )}

            <div className="space-y-3">
              {listings.map((s, i) => (
                <div key={s.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900">{s.title}</h3>
                    <span className="text-base font-bold text-cyan-600">₹{s.price || 'Free'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">by {s.providerName}</p>
                  {s.description && <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">{s.description}</p>}
                  {(s.contactName || s.contactPhone) && (
                    <div className="bg-cyan-50 rounded-xl p-3 mb-2">
                      {s.contactName && <p className="text-xs font-semibold text-cyan-800">👤 {s.contactName}</p>}
                      {s.contactPhone && <p className="text-xs text-cyan-700">📱 {s.contactPhone}</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                    {s.location && <span className="flex items-center gap-1">📍 {s.location}</span>}
                    {s.availability && <span className="flex items-center gap-1">🕐 {s.availability}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRequestTarget({ id: s.id, title: s.title })} className="flex-1 py-2.5 text-sm font-bold text-cyan-600 bg-cyan-50 rounded-xl hover:bg-cyan-100 transition-colors active:scale-[0.98]">
                      Request
                    </button>
                    <button onClick={() => handleStartChat(s.providerId)} disabled={chatLoading === s.providerId}
                      className="py-2.5 px-4 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50">
                      {chatLoading === s.providerId ? '...' : '💬'}
                    </button>
                    {s.contactPhone && (
                      <a href={`tel:${s.contactPhone}`} className="py-2.5 px-4 text-sm font-bold text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                        📞
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Requests */}
        {tab === 'requests' && (
          <div className="animate-in fade-in">
            {reqLoad && <LoadingState />}
            {reqErr && <ErrorState message={reqErr} />}
            {!reqLoad && !reqErr && requests.length === 0 && (
              <div className="text-center py-16 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-sky-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📋</span>
                </div>
                <p className="text-base font-semibold text-gray-700">No service requests yet</p>
              </div>
            )}
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Request #{r.id.slice(0, 8)}</p>
                      {r.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{r.description}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : r.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700' : r.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Services */}
        {tab === 'my' && (
          <div className="animate-in fade-in">
            {myListings.length === 0 && (
              <div className="text-center py-16 animate-in fade-in">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-sky-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🛠️</span>
                </div>
                <p className="text-base font-semibold text-gray-700">You haven't offered any services yet</p>
                <p className="text-sm text-gray-400 mt-1">Tap + to list a service for your community</p>
              </div>
            )}
            <div className="space-y-3">
              {myListings.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900">{s.title}</h3>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : s.status === 'PAUSED' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>{s.status}</span>
                  </div>
                  {s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.description}</p>}
                  <p className="text-lg font-bold text-cyan-600">₹{s.price || 'Free'}</p>
                  {(s.contactName || s.contactPhone) && (
                    <div className="mt-2 text-xs text-gray-500">
                      {s.contactName && <span>👤 {s.contactName}</span>}
                      {s.contactPhone && <span className="ml-2">📱 {s.contactPhone}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Dialog */}
      {requestTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Request Service</h3>
            <p className="text-sm text-gray-500 mb-4">{requestTarget.title}</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Describe what you need</label>
              <textarea value={requestDesc} onChange={(e) => setRequestDesc(e.target.value)} rows={3} className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none" placeholder="Optional details about your request..." />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setRequestTarget(null); setRequestDesc(''); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={handleRequest} disabled={mutating} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-500 rounded-xl hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 active:scale-95 transition-all">
                {mutating ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Listing Dialog */}
      {showCreateListing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Offer a Service</h3>
            <p className="text-sm text-gray-500 mb-4">List a service for your community</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Title *</label>
                <input value={newListing.title} onChange={(e) => setNewListing({ ...newListing, title: e.target.value })} placeholder="e.g. Plumbing, Tutoring..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input value={newListing.contactName} onChange={(e) => setNewListing({ ...newListing, contactName: e.target.value })} placeholder="Contact name"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <input value={newListing.contactPhone} onChange={(e) => setNewListing({ ...newListing, contactPhone: e.target.value })} placeholder="+91..." type="tel"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={newListing.description} onChange={(e) => setNewListing({ ...newListing, description: e.target.value })} rows={3} placeholder="What you offer..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (₹)</label>
                <input value={newListing.price} onChange={(e) => setNewListing({ ...newListing, price: e.target.value })} placeholder="0 for free"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
                <input value={newListing.location} onChange={(e) => setNewListing({ ...newListing, location: e.target.value })} placeholder="e.g. Local area"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Availability</label>
                <input value={newListing.availability} onChange={(e) => setNewListing({ ...newListing, availability: e.target.value })} placeholder="e.g. Weekends, Evenings"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                <select value={newListing.categoryId} onChange={(e) => setNewListing({ ...newListing, categoryId: e.target.value })}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none bg-white">
                  <option value="">Select category</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowCreateListing(false); setNewListing({ title: '', description: '', price: '', contactName: '', contactPhone: '', location: '', availability: '', categoryId: '' }); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={handleCreateListing} disabled={!newListing.title.trim() || mutating}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-sky-500 rounded-xl hover:from-cyan-600 hover:to-sky-600 disabled:opacity-50 active:scale-95 transition-all">
                {mutating ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
