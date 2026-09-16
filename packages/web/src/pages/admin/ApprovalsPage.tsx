import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
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

export default function AdminApprovalsPage() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [rejectTarget, setRejectTarget] = useState<MembershipRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      const res = await api<{ data: MembershipRequest[] }>('/membership-requests?status=PENDING&limit=100');
      setRequests(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (request: MembershipRequest) => {
    setProcessing(request.id);
    try {
      await api(`/membership-requests/${request.id}/approve`, { method: 'POST' });
      const label = request.requestType === 'CREATE_COMMUNITY'
        ? `Community "${request.communityName}" created`
        : 'Member request approved';
      setActionSuccess(`${label} successfully`);
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

  const handleManualRefresh = () => {
    loadRequests();
    setLastRefresh(new Date());
  };

  if (loading) return <DashboardLayout title="Approvals" navItems={adminNav} navTitle="Admin"><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout title="Approvals" navItems={adminNav} navTitle="Admin">
      {error && <ErrorState message={error} onRetry={loadRequests} />}
      {!error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {actionSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{actionSuccess}</div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Approval Requests ({requests.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Community creation and membership requests</p>
            </div>
            <button onClick={handleManualRefresh} className="text-xs text-teal-600 hover:text-teal-700">Refresh</button>
          </div>

          {requests.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">No pending requests</p>
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            req.requestType === 'CREATE_COMMUNITY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {req.requestType === 'CREATE_COMMUNITY' ? 'Create Community' : 'Join Community'}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {req.requestType === 'CREATE_COMMUNITY'
                            ? `Create "${req.communityName}" (${req.communitySlug})`
                            : `Join community`
                          }
                        </h3>
                        {req.message && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.message}</p>
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

          <div className="text-center">
            <span className="text-[10px] text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject Request"
        message={`Reject this ${rejectTarget?.requestType === 'CREATE_COMMUNITY' ? 'community creation' : 'join community'} request?`}
        confirmLabel="Reject"
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
        loading={processing === rejectTarget?.id}
      />
    </DashboardLayout>
  );
}
