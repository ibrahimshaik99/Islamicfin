import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { communityMemberships, communities } from '../db/schema';
import { type TenantContext } from './context';

export type { TenantContext } from './context';

export interface MembershipResult {
  membershipId: string;
  communityId: string;
  userId: string;
  role: string;
  status: string;
  communityName: string;
  communitySlug: string;
  communityStatus: string;
}

export async function getMembership(
  userId: string,
  communityId: string,
): Promise<MembershipResult | null> {
  const result = await db
    .select({
      membershipId: communityMemberships.id,
      communityId: communityMemberships.communityId,
      userId: communityMemberships.userId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      communityName: communities.name,
      communitySlug: communities.slug,
      communityStatus: communities.status,
    })
    .from(communityMemberships)
    .innerJoin(
      communities,
      eq(communityMemberships.communityId, communities.id),
    )
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getUserMemberships(
  userId: string,
): Promise<MembershipResult[]> {
  return db
    .select({
      membershipId: communityMemberships.id,
      communityId: communityMemberships.communityId,
      userId: communityMemberships.userId,
      role: communityMemberships.role,
      status: communityMemberships.status,
      communityName: communities.name,
      communitySlug: communities.slug,
      communityStatus: communities.status,
    })
    .from(communityMemberships)
    .innerJoin(
      communities,
      eq(communityMemberships.communityId, communities.id),
    )
    .where(eq(communityMemberships.userId, userId));
}

export async function isCommunityMember(
  userId: string,
  communityId: string,
): Promise<boolean> {
  const membership = await getMembership(userId, communityId);
  return membership !== null && membership.status === 'ACTIVE';
}

export async function resolveTenantContext(
  userId: string,
  communityId: string,
): Promise<TenantContext | null> {
  const membership = await getMembership(userId, communityId);

  if (!membership) return null;
  if (membership.status !== 'ACTIVE') return null;
  if (membership.communityStatus !== 'ACTIVE') return null;

  return {
    userId,
    communityId,
    role: membership.role,
    membershipId: membership.membershipId,
  };
}
