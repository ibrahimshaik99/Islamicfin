export interface TenantContext {
  userId: string;
  communityId: string;
  role: string;
  membershipId: string;
}

export type TenantScopedQuery<T> = T & { communityId: string };
