export interface TenantContext {
  userId: string;
  communityId: string;
  role: string;
  membershipId: string;
  /**
   * City of the member's community. For customers this is their "default
   * local marketplace": products are only listed there when the merchant has
   * selected this city. `null` when the community has no city assigned.
   */
  communityCityId: string | null;
}

export type TenantScopedQuery<T> = T & { communityId: string };
