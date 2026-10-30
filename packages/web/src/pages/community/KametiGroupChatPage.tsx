import { useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, EmptyStateCard, UserAvatar } from '../../components/ui';
import { ChatThread } from '../../components/chat';
import { conversationTitle } from '../../components/chat/chatUtils';

/**
 * Full-screen Kameti group chat (legacy route /community/kameti/:groupId/chat).
 * Reuses the shared ChatThread; the members sidebar reads real conversation
 * membership from the conversation details endpoint.
 */
export default function KametiGroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { conversations, loading: convLoad, error: convErr, refetch: refetchConv } =
    useRealtimeConversations(communityId, user?.id);
  const kametiConversation = conversations.find((c) => c.type === 'KAMETI');
  const selectedId = kametiConversation?.id || null;

  const { messages, loading: msgLoad, error: msgErr, refetch: refetchMsg, sendMessage } =
    useRealtimeMessages(communityId, selectedId);

  const { data: groupData, loading: groupLoading } = useApi<{ id: string; name: string; status: string }>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}` : null,
  );

  const { data: convDetails, loading: membersLoading } = useApi<{
    members?: Array<{ userId: string; name: string; email: string }>;
  }>(communityId && selectedId ? `${prefix}/conversations/${selectedId}` : null);

  const members = convDetails?.members || [];

  if (convLoad || groupLoading) return <LoadingState />;
  if (convErr) return <EmptyStateCard title="Could not load the group chat" description={convErr} />;

  if (!kametiConversation) {
    return (
      <DashboardLayout title="Kameti Group Chat" navItems={communityNav} navTitle="Community">
        <div className="bg-white rounded-2xl border border-line shadow-card">
          <EmptyStateCard
            title="No group chat yet"
            description="The Kameti group chat is created automatically when a member joins a Kameti group."
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={groupData?.name || 'Kameti Group Chat'} navItems={communityNav} navTitle="Community">
      <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-line overflow-hidden shadow-card -mt-2 animate-in">
        {/* Members sidebar */}
        <aside className="w-64 border-r border-line flex-col bg-surface/50 hidden lg:flex">
          <div className="p-4 border-b border-line">
            <h3 className="text-sm font-bold text-ink">Group Members</h3>
            <p className="text-xs text-muted mt-0.5">{members.length} members</p>
          </div>
          <div className="flex-1 overflow-y-auto chat-scroll p-2">
            {membersLoading ? (
              <div className="p-2">
                <LoadingState message="Loading members…" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted p-2">No members found</p>
            ) : (
              members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white transition-colors">
                  <UserAvatar name={m.name || m.email || '?'} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{m.name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted truncate">{m.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 min-w-0">
          <ChatThread
            communityId={communityId}
            conversationId={kametiConversation.id}
            title={groupData?.name || conversationTitle(kametiConversation)}
            subtitle={`${members.length || kametiConversation.memberCount} members · Kameti group`}
            memberCount={kametiConversation.memberCount}
            type={kametiConversation.type}
            messages={messages}
            loading={msgLoad}
            error={msgErr}
            currentUserId={user?.id}
            onSend={async (body) => {
              const ok = await sendMessage(body);
              if (ok) {
                refetchMsg();
                refetchConv();
              }
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
