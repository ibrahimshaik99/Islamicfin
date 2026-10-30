import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
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
 * Customer inbox + thread.
 *
 * URL-driven: /app/messages (inbox) and /app/messages?conversationId=<id>
 * (thread), so threads are linkable and the back button behaves. Mobile shows
 * one pane at a time; desktop (md+) shows the split layout.
 */
export default function CustomerMessagesPage() {
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('conversationId'),
  );
  const [showNewChat, setShowNewChat] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    communityId && showNewChat ? `/communities/${communityId}/members?limit=200` : null,
  );

  // Keep selection in sync with the URL.
  useEffect(() => {
    const urlId = searchParams.get('conversationId');
    if (urlId !== selectedId) setSelectedId(urlId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-open the first conversation on desktop (never on mobile).
  useEffect(() => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop && !selectedId && !showNewChat && conversations.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, showNewChat]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setImagePreview(null);
    const next = new URLSearchParams(searchParams);
    next.set('conversationId', id);
    setSearchParams(next, { replace: true });
  };

  const closeThread = () => {
    setSelectedId(null);
    setImagePreview(null);
    const next = new URLSearchParams(searchParams);
    next.delete('conversationId');
    setSearchParams(next, { replace: true });
  };

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async (body: string) => {
    const ok = await sendMessage(body);
    if (ok) {
      refetchMsg();
      refetchConv();
    }
  };

  const handleFileSelected = (dataUrl: string) => {
    setImagePreview(dataUrl);
  };

  const handleSendImage = async (dataUrl: string) => {
    const ok = await sendMessage('Photo', 'IMAGE', dataUrl);
    if (ok) {
      setImagePreview(null);
      refetchMsg();
      refetchConv();
    }
  };

  const handleCreateChat = async (userId: string) => {
    const conv = await createConversation('DIRECT', [userId]);
    if (conv?.id) {
      setShowNewChat(false);
      selectConversation(conv.id);
    }
  };

  const threadVisible = !!selectedId;
  const inboxVisible = !threadVisible;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-none mx-auto md:h-screen md:flex">
        {/* Inbox */}
        <div
          className={`${
            inboxVisible ? 'flex' : 'hidden'
          } md:flex md:w-80 lg:w-96 md:flex-shrink-0 h-[calc(100vh-4rem-env(safe-area-inset-bottom,0px))] md:h-screen`}
        >
          <ChatInbox
            conversations={conversations}
            loading={convLoad}
            error={convErr}
            selectedId={selectedId}
            currentUserId={user?.id}
            onSelect={selectConversation}
            onNewChat={() => setShowNewChat(true)}
            onRetry={refetchConv}
          />
        </div>

        {/* Thread */}
        <div
          className={`${
            threadVisible ? 'flex' : 'hidden'
          } md:flex md:flex-1 h-[calc(100vh-4rem-env(safe-area-inset-bottom,0px))] md:h-screen`}
        >
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
              onBack={closeThread}
              onSend={handleSend}
              imagePreview={imagePreview}
              onFileSelected={handleFileSelected}
              onSendImage={handleSendImage}
              onClearImage={() => setImagePreview(null)}
            />
          ) : (
            /* No thread selected — desktop placeholder, mobile shows inbox. */
            <div className="hidden md:flex flex-1 items-center justify-center bg-surface">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink">Select a conversation</p>
                <p className="text-xs text-muted mt-1">Choose from the list to start chatting.</p>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="mt-4 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  ← Back to home
                </button>
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
    </div>
  );
}
