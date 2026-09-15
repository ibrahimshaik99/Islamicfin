import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { ConfirmDialog } from '../../components/admin/AdminComponents';

interface MembershipRequest {
  id: string;
  userId: string;
  communityId: string | null;
  requestType: string;
  status: string;
  communityName: string | null;
  communitySlug: string | null;
  message: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function CommunityApprovalsPage() {
  const { communityId } = useAuth();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectTarget, setRejectTarget] = useState<MembershipRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadRequests = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await api<{ data: MembershipRequest[] }>('/membership-requests?status=PENDING&type=JOIN_COMMUNITY&limit=100');
      setRequests(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (request: MembershipRequest) => {
    setProcessing(request.id);
    try {
      await api(`/membership-requests/${request.id}/approve`, { method: 'POST' });
      setActionSuccess('Member request approved successfully');
      loadRequests();
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget.id);
    try {
      await api(`/membership-requests/${rejectTarget.id}/reject`, {
        method: 'POST',
        body: { reason: rejectReason || undefined },
      });
      setRejectTarget(null);
      setRejectReason('');
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <DashboardLayout title="Approvals" navItems={communityNav} navTitle="Community"><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout title="Member Approvals" navItems={communityNav} navTitle="Community">
      {error && <ErrorState message={error} onRetry={loadRequests} />}
      {!error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {actionSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{actionSuccess}</div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Member Requests ({requests.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Users waiting to join your community</p>
            </div>
            <button onClick={() => loadRequests()} className="text-xs text-teal-600 hover:text-teal-700">Refresh</button>
          </div>

          {requests.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">No pending member requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card key={req.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">New member request</h3>
                        {req.message && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">"{req.message}"</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Requested {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={processing === req.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {processing === req.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectTarget(req)}
                          disabled={processing === req.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject Member"
        message="Reject this member request?"
        confirmLabel="Reject"
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
        loading={processing === rejectTarget?.id}
      />
    </DashboardLayout>
  );
}
