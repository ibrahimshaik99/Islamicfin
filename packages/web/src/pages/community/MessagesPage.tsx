import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { ChatInbox, ChatThread, NewChatModal } from '../../components/chat';
import { conversationTitle } from '../../components/chat/chatUtils';
import type { CommunityMember } from '../../lib/types';

/**
 * Community-admin messaging: split inbox/thread on desktop, single pane on
 * mobile. Group conversations open a real info drawer (members from the
 * conversation details endpoint).
 */
export default function MessagesPage() {
  const { communityId, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewConv, setShowNewConv] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const autoSelectedRef = useRef(false);

  const {
    conversations,
    loading: convLoad,
    error: convErr,
    refetch: refetchConv,
    createConversation,
  } = useRealtimeConversations(communityId, user?.id);
  const {
    messages,
    loading: msgLoad,
    error: msgErr,
    refetch: refetchMsg,
    sendMessage,
  } = useRealtimeMessages(communityId, selectedId);

  const { data: memberData, loading: memberLoad } = useApi<CommunityMember[]>(
    communityId && showNewConv ? `/communities/${communityId}/members?limit=200` : null,
  );

  const selected = conversations.find((c) => c.id === selectedId) || null;
  const isGroup = selected ? selected.type !== 'DIRECT' : false;

  // Group info: members via the conversation details endpoint (real data).
  const { data: convDetails } = useApi<{ members?: { userId: string; name: string; email: string }[] }>(
    communityId && selectedId && infoOpen
      ? `/communities/${communityId}/conversations/${selectedId}`
      : null,
  );

  // Auto-open first conversation on desktop only.
  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop && !selectedId && !showNewConv && conversations.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, showNewConv]);

  const handleSend = useCallback(
    async (body: string) => {
      const ok = await sendMessage(body);
      if (ok) {
        refetchMsg();
        refetchConv();
      }
    },
    [sendMessage, refetchMsg, refetchConv],
  );

  const handleCreateConversation = async (userId: string) => {
    const conv = await createConversation('DIRECT', [userId]);
    setShowNewConv(false);
    if (conv?.id) setSelectedId(conv.id);
  };

  const infoAction = isGroup ? (
    <button
      type="button"
      onClick={() => setInfoOpen((o) => !o)}
      aria-label="Group info"
      aria-expanded={infoOpen}
      className={`touch-target flex items-center justify-center rounded-xl transition-colors ${
        infoOpen ? 'bg-primary-50 text-primary-600' : 'text-muted hover:bg-surface'
      }`}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    </button>
  ) : null;

  return (
    <DashboardLayout title="Messages" navItems={communityNav} navTitle="Community">
      <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-line overflow-hidden -mt-2 animate-in">
        {/* Inbox */}
        <div
          className={`${
            selectedId ? 'hidden md:flex' : 'flex'
          } flex-col w-full md:w-80 lg:w-96 md:flex-shrink-0 min-h-0`}
        >
          <ChatInbox
            conversations={conversations}
            loading={convLoad}
            error={convErr}
            selectedId={selectedId}
            currentUserId={user?.id}
            onSelect={(id) => {
              setSelectedId(id);
              setInfoOpen(false);
            }}
            onNewChat={() => setShowNewConv(true)}
            onRetry={refetchConv}
          />
        </div>

        {/* Thread */}
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
          {selected ? (
            <div className="relative flex-1 min-w-0">
              <ChatThread
                communityId={communityId}
                conversationId={selected.id}
                title={conversationTitle(selected)}
                memberCount={selected.memberCount}
                type={selected.type}
                messages={messages}
                loading={msgLoad}
                error={msgErr}
                currentUserId={user?.id}
                onBack={() => setSelectedId(null)}
                onSend={handleSend}
                headerAction={infoAction}
              />

              {/* Group info drawer */}
              {infoOpen && (
                <div className="absolute inset-y-0 right-0 w-72 bg-white border-l border-line shadow-soft z-20 flex flex-col animate-in">
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                    <h3 className="text-sm font-bold text-ink">Group info</h3>
                    <button
                      type="button"
                      onClick={() => setInfoOpen(false)}
                      aria-label="Close group info"
                      className="touch-target -mr-2 flex items-center justify-center rounded-xl hover:bg-surface"
                    >
                      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto chat-scroll">
                    <div className="px-4 py-3 border-b border-line">
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Conversation</p>
                      <p className="text-sm font-semibold text-ink mt-1">{conversationTitle(selected)}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {selected.type} · created {new Date(selected.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                        Members ({convDetails?.members?.length ?? selected.memberCount})
                      </p>
                      {!convDetails?.members && <p className="text-xs text-muted">Loading members…</p>}
                      {convDetails?.members?.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0">
                          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(m.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ink truncate">{m.name}</p>
                            <p className="text-[10px] text-muted truncate">{m.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink">Select a conversation</p>
                <p className="text-xs text-muted mt-1">Choose from the list to start chatting.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewConv && (
        <NewChatModal
          members={(memberData || []).map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.name,
            userName: m.userName,
            email: m.email,
            userEmail: m.userEmail,
            role: m.role,
          }))}
          loading={memberLoad}
          currentUserId={user?.id}
          onSelect={handleCreateConversation}
          onClose={() => setShowNewConv(false)}
        />
      )}
    </DashboardLayout>
  );
}
