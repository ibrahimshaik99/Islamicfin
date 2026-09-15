import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from './api';
import type { Conversation, Message } from './types';

const SOCKET_URL = window.location.hostname === 'localhost'
  ? `http://localhost:8789`
  : '';

interface UseRealtimeConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createConversation: (type: string, memberIds: string[]) => Promise<Conversation | null>;
}

export function useRealtimeConversations(
  communityId: string | null,
  _userId?: string | null,
): UseRealtimeConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prefix = communityId ? `/communities/${communityId}` : '';
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!communityId) return;
    try {
      const res = await api<{ data: Conversation[] }>(`${prefix}/conversations`);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setConversations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [communityId, prefix]);

  // Initial fetch + polling
  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(() => fetchConversations(), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  const createConversation = useCallback(async (type: string, memberIds: string[]): Promise<Conversation | null> => {
    if (!communityId) return null;
    try {
      const res = await api<{ data: Conversation }>(`${prefix}/conversations`, {
        method: 'POST',
        body: { type, memberIds },
      });
      const conv = res?.data || res;
      await fetchConversations();
      return conv as Conversation;
    } catch {
      return null;
    }
  }, [communityId, prefix, fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations, createConversation };
}

interface UseRealtimeMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  sendMessage: (body: string, messageType?: string, attachmentUrl?: string) => Promise<boolean>;
}

export function useRealtimeMessages(
  communityId: string | null,
  conversationId: string | null | undefined,
): UseRealtimeMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefix = communityId ? `/communities/${communityId}` : '';
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!communityId || !conversationId) return;
    try {
      const res = await api<{ data: Message[] }>(`${prefix}/conversations/${conversationId}/messages`);
      const data = Array.isArray(res) ? res : (res?.data || []);
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [communityId, conversationId, prefix]);

  // Socket.IO connection (will fail gracefully if server not running)
  useEffect(() => {
    if (!conversationId || !SOCKET_URL) return;

    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        timeout: 3000,
      });

      socket.on('connect', () => {
        socket.emit('join-conversation', conversationId);
      });

      socket.on('new-message', (msg: Message) => {
        if (msg.conversationId === conversationId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });

      socket.on('conversation-updated', () => {
        fetchMessages();
      });

      socketRef.current = socket;

      return () => {
        socket.emit('leave-conversation', conversationId);
        socket.disconnect();
      };
    } catch {
      // Socket.IO server not available, will use polling instead
    }
  }, [conversationId, fetchMessages]);

  // Polling fallback (always runs as backup)
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    fetchMessages();
    pollRef.current = setInterval(() => fetchMessages(), 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(async (body: string, messageType = 'TEXT', attachmentUrl?: string): Promise<boolean> => {
    if (!communityId || !conversationId) return false;
    try {
      const res = await api<{ data: Message }>(`${prefix}/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: { body, messageType, attachmentUrl },
      });
      const msg = res?.data || res;
      if (msg && typeof msg === 'object' && 'id' in msg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === (msg as Message).id)) return prev;
          return [...prev, msg as Message];
        });
      }
      // Notify Socket.IO if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', { conversationId, message: msg });
      }
      return true;
    } catch {
      return false;
    }
  }, [communityId, conversationId, prefix]);

  return { messages, loading, error, refetch: fetchMessages, sendMessage };
}
