import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { communityMemberships, auditLogs } from '../db/schema';
import {
  canAssignRole,
  canAssignSensitiveRole,
  SENSITIVE_ROLES,
  ROLE_HIERARCHY,
} from './roles';
import { hasPermission } from './roles';

export interface RoleChangeResult {
  success: boolean;
  error?: string;
}

export async function changeMemberRole(
  actorId: string,
  actorRole: string,
  communityId: string,
  targetMembershipId: string,
  newRole: string,
): Promise<RoleChangeResult> {
  if (!hasPermission(actorRole, 'role:change')) {
    return { success: false, error: 'You do not have permission to change roles.' };
  }

  const isSensitive = SENSITIVE_ROLES.includes(
    newRole as (typeof SENSITIVE_ROLES)[number],
  );

  if (isSensitive && !hasPermission(actorRole, 'role:change:sensitive')) {
    return {
      success: false,
      error: 'You do not have permission to assign this sensitive role.',
    };
  }

  if (!canAssignRole(actorRole, newRole)) {
    return {
      success: false,
      error: `Cannot assign a role equal to or higher than your own.`,
    };
  }

  if (isSensitive && !canAssignSensitiveRole(actorRole, newRole)) {
    return {
      success: false,
      error: `Cannot assign this sensitive role with your current role.`,
    };
  }

  const [targetMembership] = await db
    .select({
      id: communityMemberships.id,
      userId: communityMemberships.userId,
      role: communityMemberships.role,
      status: communityMemberships.status,
    })
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.id, targetMembershipId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);

  if (!targetMembership) {
    return { success: false, error: 'Target membership not found.' };
  }

  if (targetMembership.status !== 'ACTIVE') {
    return { success: false, error: 'Cannot change role of inactive member.' };
  }

  if (actorId === targetMembership.userId) {
    return { success: false, error: 'Cannot change your own role.' };
  }

  const currentRoleLevel = ROLE_HIERARCHY[targetMembership.role] ?? 0;
  const actorRoleLevel = ROLE_HIERARCHY[actorRole] ?? 0;

  if (currentRoleLevel >= actorRoleLevel) {
    return {
      success: false,
      error: 'Cannot change the role of someone with equal or higher privileges.',
    };
  }

  const oldRole = targetMembership.role;

  await db
    .update(communityMemberships)
    .set({ role: newRole as never, updatedAt: new Date() })
    .where(eq(communityMemberships.id, targetMembershipId));

  await db.insert(auditLogs).values({
    communityId,
    actorId,
    action: 'ROLE_CHANGED',
    entityType: 'community_membership',
    entityId: targetMembershipId,
    oldValues: { role: oldRole },
    newValues: { role: newRole },
  });

  return { success: true };
}
