import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, ErrorState } from '../../components/ui';

export default function KametiGroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [msgInput, setMsgInput] = useState('');
  const [isMobileChat, setIsMobileChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: convLoad, error: convErr, refetch: refetchConv } = useRealtimeConversations(communityId, user?.id);

  // Find the KAMETI conversation for this community
  const kametiConversation = conversations.find((c) => c.type === 'KAMETI');
  const selectedId = kametiConversation?.id || null;

  const { messages, loading: msgLoad, error: msgErr, refetch: refetchMsg, sendMessage } = useRealtimeMessages(communityId, selectedId);

  // Fetch group details
  const { data: groupData, loading: groupLoading } = useApi<{ id: string; name: string; totalMembers: number; status: string }>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}` : null,
  );

  // Fetch members of the conversation
  const { data: convMembers, loading: membersLoading } = useApi<{ members: Array<{ userId: string; name: string; email: string }> }>(
    communityId && selectedId ? `${prefix}/conversations/${selectedId}` : null,
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-select and mark as mobile on small screens
  useEffect(() => {
    if (kametiConversation && !isMobileChat) {
      setIsMobileChat(true);
    }
  }, [kametiConversation, isMobileChat]);

  const handleSend = useCallback(async () => {
    if (!msgInput.trim() || !selectedId) return;
    const body = msgInput.trim();
    setMsgInput('');
    const ok = await sendMessage(body);
    if (ok) {
      refetchMsg();
      refetchConv();
    }
  }, [msgInput, selectedId, sendMessage, refetchMsg, refetchConv]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (convLoad || groupLoading) return <LoadingState />;
  if (convErr) return <ErrorState message={convErr} />;

  if (!kametiConversation) {
    return (
      <DashboardLayout title="Kameti Group Chat" navItems={communityNav} navTitle="Community">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No Group Chat Yet</h3>
          <p className="text-sm text-slate-500">Group chat is created automatically when a member joins a Kameti group.</p>
        </div>
      </DashboardLayout>
    );
  }

  const members = convMembers?.members || [];

  return (
    <DashboardLayout title={groupData?.name || 'Kameti Group Chat'} navItems={communityNav} navTitle="Community">
      <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {/* Members sidebar */}
        <div className="w-64 border-r border-slate-100 flex flex-col bg-slate-50/50 hidden lg:flex">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Group Members</h3>
            <p className="text-xs text-slate-500 mt-0.5">{members.length} members</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {membersLoading ? (
              <p className="text-xs text-slate-400 p-2">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-xs text-slate-400 p-2">No members found</p>
            ) : (
              members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-teal-700">
                      {(m.name || m.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">{m.name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{groupData?.name || 'Kameti Group'}</h2>
                <p className="text-xs text-slate-500">{members.length} members</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgLoad && messages.length === 0 ? (
              <LoadingState />
            ) : msgErr ? (
              <ErrorState message={msgErr} />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMine ? 'order-2' : ''}`}>
                      {!isMine && (
                        <p className="text-[10px] font-medium text-slate-500 mb-0.5 px-1">{msg.senderName}</p>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm ${
                        isMine
                          ? 'bg-teal-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-900 rounded-bl-md'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      </div>
                      <p className={`text-[10px] text-slate-400 mt-0.5 px-1 ${isMine ? 'text-right' : ''}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!msgInput.trim()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
