import { useState, useRef, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Conversation, CommunityMember } from '../../lib/types';

export default function MessagesPage() {
  const { communityId, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [isMobileChat, setIsMobileChat] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [newMemberSearch, setNewMemberSearch] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { conversations, loading: convLoad, error: convErr, refetch: refetchConv, createConversation } = useRealtimeConversations(communityId, user?.id);
  const { messages, loading: msgLoad, error: msgErr, refetch: refetchMsg, sendMessage } = useRealtimeMessages(communityId, selectedId);

  const { data: memberData, loading: memberLoad } = useApi<CommunityMember[]>(
    communityId && showNewConv ? `/communities/${communityId}/members?limit=200` : null,
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const members = memberData || [];
  const selected = conversations.find((c) => c.id === selectedId);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (!selectedId && !showNewConv && conversations.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(conversations[0].id);
      setIsMobileChat(true);
    }
  }, [selectedId, conversations, showNewConv]);

  const filteredConversations = conversations.filter((c) =>
    !search || (c.name || c.type).toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    m.userId !== user?.id &&
    (!newMemberSearch || (m.userName || m.name || '').toLowerCase().includes(newMemberSearch.toLowerCase()))
  );

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

  const handleCreateConversation = async (memberId: string) => {
    const conv = await createConversation('DIRECT', [memberId]);
    if (conv?.id) {
      setSelectedId(conv.id);
      setIsMobileChat(true);
    }
    setShowNewConv(false);
    setNewMemberSearch('');
  };

  const openChat = (id: string) => {
    setSelectedId(id);
    setIsMobileChat(true);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getConvTitle = (c: Conversation) => {
    if (c.name && c.name !== 'DIRECT' && c.name !== 'GROUP' && c.name !== 'ORDER' && c.name !== 'KAMETI' && c.name !== 'PROJECT') return c.name;
    return c.type;
  };

  return (
    <DashboardLayout title="Messages" navItems={communityNav} navTitle="Community">
      <div className="h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-slate-200 overflow-hidden -mt-2 animate-in fade-in duration-300">
        {/* Conversation List */}
        <div className={`${isMobileChat && selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200`}>
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Messages</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewConv(true)}
                  className="text-xs bg-teal-600 text-white px-2 py-1 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  + New
                </button>
                <button
                  onClick={() => refetchConv()}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  Refresh
                </button>
              </div>
            </div>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
          {convLoad && <div className="p-4"><LoadingState /></div>}
          {convErr && <div className="p-4"><ErrorState message={convErr} /></div>}
          {!convLoad && !convErr && filteredConversations.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                  <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">No conversations yet</p>
                <p className="text-[10px] text-slate-400 mt-1">Start chatting from Marketplace or Kameti</p>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c.id)}
                className={`w-full text-left px-3 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors ${selectedId === c.id ? 'bg-teal-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-teal-700">{getConvTitle(c)[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 truncate">{getConvTitle(c)}</p>
                      {c.updatedAt && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(c.updatedAt)}</span>
                      )}
                    </div>
                    {c.lastMessage && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{c.type}</span>
                      {(c.memberCount || 0) > 0 && (
                        <span className="text-[10px] text-slate-400">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`${!isMobileChat && !selectedId ? 'hidden md:flex' : 'flex'} flex-col flex-1`}>
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">Select a conversation</p>
                <p className="text-xs text-slate-500 mt-1">Choose from the left panel to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
                <button
                  onClick={() => setIsMobileChat(false)}
                  className="md:hidden -ml-1 p-1"
                >
                  <svg className="h-5 w-5 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-teal-700">{getConvTitle(selected!)[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{getConvTitle(selected!)}</p>
                  <p className="text-[10px] text-slate-400">
                    {selected?.memberCount || 0} member{(selected?.memberCount || 0) !== 1 ? 's' : ''} · {selected?.type}
                  </p>
                </div>
                <button
                  onClick={() => refetchMsg()}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Refresh messages"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
                {msgLoad && <LoadingState />}
                {msgErr && <ErrorState message={msgErr} />}
                {!msgLoad && !msgErr && messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-2">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400 mt-1">Send the first message to start the conversation</p>
                  </div>
                )}
                {messages.map((m) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${isMe ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white text-slate-900 rounded-bl-sm shadow-sm border border-slate-100'}`}>
                        {!isMe && <p className="text-[10px] font-medium text-teal-600 mb-0.5">{m.senderName || 'Unknown'}</p>}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[9px] mt-1 ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white">
                <div className="flex items-end gap-2">
                  <textarea
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none resize-none min-h-[36px] max-h-[100px]"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!msgInput.trim()}
                    className="w-10 h-10 bg-teal-600 text-white rounded-2xl flex items-center justify-center hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">New Conversation</h3>
              <button
                onClick={() => { setShowNewConv(false); setNewMemberSearch(''); }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100">
              <input
                value={newMemberSearch}
                onChange={(e) => setNewMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500 outline-none"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {memberLoad && (
                <div className="p-4"><LoadingState /></div>
              )}
              {!memberLoad && filteredMembers.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">No members found</div>
              )}
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleCreateConversation(m.userId)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-teal-700">{((m.userName || m.name) || '?')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.userName || m.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.userEmail || m.email}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{m.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
