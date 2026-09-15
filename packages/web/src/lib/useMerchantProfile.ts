import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from './api';

export interface MerchantProfile {
  id: string;
  userId: string;
  communityId: string;
  businessName: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  upiId: string | null;
  upiQrUrl: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export function useMerchantProfile(refreshInterval = 30000) {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = useCallback(async (signal?: AbortSignal) => {
    if (!prefix) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: MerchantProfile }>(`${prefix}/merchants/my`, { signal });
      if (signal?.aborted) return;
      setMerchant(res.data);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError) {
        setMerchant(null);
        setError(err.message);
      } else {
        setMerchant(null);
        setError('An unexpected error occurred');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMerchant(controller.signal);
    return () => controller.abort();
  }, [fetchMerchant]);

  useEffect(() => {
    if (!prefix) return;
    const interval = setInterval(() => fetchMerchant(), refreshInterval);
    return () => clearInterval(interval);
  }, [prefix, fetchMerchant, refreshInterval]);

  useEffect(() => {
    if (!prefix) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMerchant();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [prefix, fetchMerchant]);

  const refetch = useCallback(() => fetchMerchant(), [fetchMerchant]);

  return { merchant, loading, error, refetch };
}
