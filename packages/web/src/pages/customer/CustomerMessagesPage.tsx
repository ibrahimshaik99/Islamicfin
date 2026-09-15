import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Conversation } from '../../lib/types';

interface Member { id: string; userId: string; name: string; email: string; phone?: string; role: string; userName?: string; userEmail?: string; }

export default function CustomerMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { communityId, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('conversationId'));
  const [msgInput, setMsgInput] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSelectedRef = useRef(false);

  const { conversations, loading: convLoad, error: convErr, refetch: refetchConv, createConversation } = useRealtimeConversations(communityId, user?.id);
  const { messages, loading: msgLoad, error: msgErr, refetch: refetchMsg, sendMessage } = useRealtimeMessages(communityId, selectedId);

  const { data: membersData } = useApi<Member[]>(
    communityId && showNewChat ? `/communities/${communityId}/members?limit=200` : null,
  );

  useEffect(() => {
    if (searchParams.get('conversationId')) {
      setSelectedId(searchParams.get('conversationId'));
    }
  }, [searchParams]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const members = (membersData || []).filter((m) => (m.userId || m.id) !== user?.id);

  const filteredMembers = members.filter((m) =>
    !memberSearch || (m.userName || m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.userEmail || m.email || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.phone?.includes(memberSearch)
  );

  const selected = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    if (!selectedId && !showNewChat && conversations.length > 0 && !autoSelectedRef.current) {
      autoSelectedRef.current = true;
      setSelectedId(conversations[0].id);
    }
  }, [selectedId, conversations, showNewChat]);

  const handleSend = async () => {
    if (!msgInput.trim() || !selectedId) return;
    const body = msgInput.trim();
    setMsgInput('');
    const ok = await sendMessage(body);
    if (ok) {
      refetchMsg();
      refetchConv();
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview || !selectedId) return;
    const ok = await sendMessage('Photo', 'IMAGE', imagePreview);
    if (ok) {
      setImagePreview(null);
      refetchMsg();
      refetchConv();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateChat = async (member: Member) => {
    const userId = member.userId || member.id;
    const conv = await createConversation('DIRECT', [userId]);
    if (conv?.id) {
      setShowNewChat(false);
      setMemberSearch('');
      setSelectedId(conv.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const unreadCount = (c: Conversation) => {
    if (!c.lastMessage || c.lastMessage.senderId === user?.id) return 0;
    return 1;
  };

  const getDisplayName = (c?: Conversation | null) => {
    if (!c) return 'Direct Message';
    if (c.name) return c.name;
    if (c.type === 'DIRECT') return 'Direct Message';
    return c.type;
  };

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/20">
        <div className="bg-gradient-to-br from-teal-600 via-emerald-500 to-green-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
                <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h1 className="text-base font-bold">Messages</h1>
            </div>
            <button onClick={() => setShowNewChat(true)}
              className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          {convLoad && <div className="p-4"><LoadingState /></div>}
          {convErr && <div className="p-4"><ErrorState message={convErr} /></div>}
          {!convLoad && !convErr && conversations.length === 0 && (
            <div className="text-center py-16 animate-in fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <p className="text-base font-semibold text-gray-700">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-1">Tap + to start a new chat</p>
            </div>
          )}
          <div className="animate-in fade-in slide-in-from-bottom-4">
            {conversations.map((c, i) => {
              const unread = unreadCount(c);
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className="w-full text-left px-4 py-4 hover:bg-white/80 border-b border-gray-100 active:bg-gray-100 transition-all"
                  style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-base font-bold text-white">{getDisplayName(c)[0]}</span>
                      </div>
                      {unread > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">{unread}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-bold truncate ${unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{getDisplayName(c)}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(c.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {c.lastMessage && (
                        <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {c.lastMessage.senderId === user?.id ? 'You: ' : ''}{c.lastMessage.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{c.memberCount || 0} member{(c.memberCount || 0) !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {showNewChat && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4 max-h-[80vh] flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-1">New Chat</h3>
              <p className="text-sm text-gray-500 mb-3">Select a community member to message</p>
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name, email, or phone..."
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none mb-3" autoFocus />
              <div className="flex-1 overflow-y-auto space-y-1 max-h-60">
                {filteredMembers.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No members found</p>
                )}
                {filteredMembers.map((m) => (
                  <button key={m.id} onClick={() => handleCreateChat(m)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-teal-50 transition-colors flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">{((m.userName || m.name) || '?')[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{m.userName || m.name}</p>
                      <p className="text-xs text-gray-500">{m.userEmail || m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowNewChat(false); setMemberSearch(''); }}
                className="w-full mt-3 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/20 flex flex-col">
      <div className="bg-gradient-to-br from-teal-600 via-emerald-500 to-green-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center gap-3 h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => { setSelectedId(null); }} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <span className="text-sm font-bold">{getDisplayName(selected)[0]}</span>
          </div>
          <div>
            <p className="text-sm font-bold">{getDisplayName(selected)}</p>
            <p className="text-[10px] text-white/70">{selected?.memberCount || 0} member{(selected?.memberCount || 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {imagePreview && (
        <div className="bg-white border-b border-gray-100 px-4 py-3 max-w-lg mx-auto w-full">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl" />
            <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-3">
        {msgLoad && messages.length === 0 && <LoadingState />}
        {msgErr && <ErrorState message={msgErr} />}
        {messages.map((m) => {
          const isMine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                {!isMine && <p className="text-[10px] text-gray-500 mb-1 ml-1">{m.senderName || 'Unknown'}</p>}
                <div className={`px-4 py-3 rounded-2xl ${isMine ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-br-md' : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md shadow-sm'}`}>
                  {m.messageType === 'IMAGE' && m.attachmentUrl ? (
                    <img src={m.attachmentUrl} alt="Photo" className="max-w-full rounded-xl mb-1" />
                  ) : null}
                  <p className="text-sm leading-relaxed">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-3 safe-bottom max-w-lg mx-auto w-full">
        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="touch-target flex items-center justify-center text-gray-400 hover:text-teal-500 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
          <input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type a message..." className="flex-1 px-4 py-3 text-sm bg-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          {(msgInput.trim() || imagePreview) && (
            <button onClick={imagePreview ? handleSendImage : handleSend}
              className="touch-target flex items-center justify-center text-teal-500 hover:text-teal-600 disabled:opacity-50 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
