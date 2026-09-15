import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button, Input, Card, CardContent } from '../../components/ui';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
}

interface MembershipRequest {
  id: string;
  requestType: string;
  status: string;
  communityName: string | null;
  communitySlug: string | null;
  message: string | null;
  createdAt: string;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { memberships, loadSession } = useAuth();
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myRequests, setMyRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Join form
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [joinMessage, setJoinMessage] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (memberships.length > 0) {
      navigate('/dashboard', { replace: true });
      return;
    }
    loadData();
  }, [memberships, navigate]);

  const loadData = async () => {
    try {
      const [commRes, reqRes] = await Promise.all([
        api<{ data: Community[] }>('/membership-requests/communities', { signal: AbortSignal.timeout(10000) }).catch(() => ({ data: [] })),
        api<{ data: MembershipRequest[] }>('/membership-requests/my', { signal: AbortSignal.timeout(10000) }).catch(() => ({ data: [] })),
      ]);
      setCommunities(commRes.data || []);
      setMyRequests(reqRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedCommunity) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api('/membership-requests', {
        method: 'POST',
        body: {
          requestType: 'JOIN_COMMUNITY',
          communityId: selectedCommunity,
          message: joinMessage || undefined,
        },
      });
      setSuccess('Request sent! Waiting for community admin approval.');
      setSelectedCommunity('');
      setJoinMessage('');
      // Reload session in case request was auto-approved
      await loadSession();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api('/membership-requests', {
        method: 'POST',
        body: {
          requestType: 'CREATE_COMMUNITY',
          communityName: newName.trim(),
          communitySlug: newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          message: newMessage || undefined,
        },
      });
      setSuccess('Request sent! Waiting for admin approval to create your community.');
      setNewName('');
      setNewSlug('');
      setNewMessage('');
      // Reload session in case request was auto-approved
      await loadSession();
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Islamic Community Platform</h1>
          <p className="text-sm text-gray-500 mt-2">Join an existing community or create your own</p>
        </div>

        {/* My Requests */}
        {myRequests.length > 0 && (
          <Card className="mb-6">
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Your Requests</h3>
                <button
                  onClick={async () => { await loadSession(); loadData(); }}
                  className="text-xs text-primary-600 hover:text-primary-500 font-medium"
                >
                  Refresh Status
                </button>
              </div>
              <div className="space-y-2">
                {myRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.requestType === 'CREATE_COMMUNITY' ? `Create "${req.communityName}"` : `Join community`}
                      </p>
                      <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              tab === 'join'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            Join Community
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              tab === 'create'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            Create Community
          </button>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{success}</div>
        )}

        {/* Join Community */}
        {tab === 'join' && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Request to Join a Community</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Community</label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Choose a community...</option>
                    {communities.filter((c) => c.status === 'ACTIVE').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                  <textarea
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="Why do you want to join this community?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={!selectedCommunity || submitting}
                  className="w-full"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Community */}
        {tab === 'create' && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Request to Create a Community</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNewSlug(generateSlug(e.target.value));
                    }}
                    placeholder="e.g., Al-Noor Islamic Center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">/</span>
                    <Input
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="al-noor-islamic-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tell us about your community..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || !newSlug.trim() || submitting}
                  className="w-full"
                >
                  {submitting ? 'Sending...' : 'Request Community Creation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
