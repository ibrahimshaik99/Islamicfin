import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { ChatInbox, ChatThread, NewChatModal } from '../../components/chat';
import { conversationTitle } from '../../components/chat/chatUtils';

interface Member {
  id: string;
  userId?: string;
  name?: string;
  userName?: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  role?: string;
}

/**
 * Merchant messaging. The conversation search now filters the conversation
 * list itself (the previous implementation bound the input to member search,
 * so it filtered nothing).
 */
export default function MerchantMessagesPage() {
  const [searchParams] = useSearchParams();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('conversationId'),
  );
  const [showNewChat, setShowNewChat] = useState(false);
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

  const { data: membersData, loading: membersLoad } = useApi<Member[]>(
    communityId && showNewChat ? `${prefix}/members?limit=200` : null,
  );

  // Auto-open first conversation on desktop only.
  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop && !selectedId && !showNewChat && conversations.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, showNewChat]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async (body: string) => {
    const ok = await sendMessage(body);
    if (ok) {
      refetchMsg();
      refetchConv();
    }
  };

  const handleCreateChat = async (userId: string) => {
    const conv = await createConversation('DIRECT', [userId]);
    if (conv?.id) {
      setShowNewChat(false);
      setSelectedId(conv.id);
    }
  };

  return (
    <DashboardLayout title="Messages" navItems={merchantNav} navTitle="Merchant">
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
            onSelect={setSelectedId}
            onNewChat={() => setShowNewChat(true)}
            onRetry={refetchConv}
          />
        </div>

        {/* Thread */}
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
          {selected ? (
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
            />
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

      {showNewChat && (
        <NewChatModal
          members={membersData || []}
          loading={membersLoad}
          currentUserId={user?.id}
          onSelect={handleCreateChat}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </DashboardLayout>
  );
}
