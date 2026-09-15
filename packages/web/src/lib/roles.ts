export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  COMMUNITY_OWNER: 80,
  COMMUNITY_ADMIN: 60,
  COMMUNITY_FINANCE_MANAGER: 50,
  COMMUNITY_MODERATOR: 40,
  MERCHANT: 30,
  MERCHANT_STAFF: 20,
  CUSTOMER: 10,
};

export type Permission =
  | 'community:read'
  | 'community:manage'
  | 'community:settings:manage'
  | 'community:members:update_role'
  | 'community:members:remove'
  | 'community:announcements:create'
  | 'community:announcements:publish'
  | 'member:read'
  | 'member:manage'
  | 'merchant:read'
  | 'merchant:manage'
  | 'merchant:apply'
  | 'merchant:verify'
  | 'merchant:suspend'
  | 'category:read'
  | 'category:manage'
  | 'product:read'
  | 'product:manage'
  | 'product:inventory:manage'
  | 'order:read'
  | 'order:create'
  | 'order:cancel'
  | 'order:manage'
  | 'payment:report'
  | 'payment:verify'
  | 'finance:read'
  | 'finance:manage'
  | 'kameti:read'
  | 'kameti:manage'
  | 'messaging:read'
  | 'messaging:send'
  | 'service:read'
  | 'service:manage'
  | 'service:request:read'
  | 'service:request:manage'
  | 'role:read'
  | 'role:change'
  | 'role:change:sensitive'
  | 'audit:read';

export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  SUPER_ADMIN: [
    'community:read',
    'community:manage',
    'community:settings:manage',
    'community:members:update_role',
    'community:members:remove',
    'community:announcements:create',
    'community:announcements:publish',
    'member:read',
    'member:manage',
    'merchant:read',
    'merchant:manage',
    'merchant:apply',
    'merchant:verify',
    'merchant:suspend',
    'category:read',
    'category:manage',
    'product:read',
    'product:manage',
    'product:inventory:manage',
    'order:read',
    'order:create',
    'order:manage',
    'payment:report',
    'payment:verify',
    'finance:read',
    'finance:manage',
    'kameti:read',
    'kameti:manage',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:manage',
    'service:request:read',
    'service:request:manage',
    'role:read',
    'role:change',
    'role:change:sensitive',
    'audit:read',
  ],
  COMMUNITY_OWNER: [
    'community:read',
    'community:manage',
    'community:settings:manage',
    'community:members:update_role',
    'community:members:remove',
    'community:announcements:create',
    'community:announcements:publish',
    'member:read',
    'member:manage',
    'merchant:read',
    'merchant:manage',
    'merchant:apply',
    'merchant:verify',
    'merchant:suspend',
    'category:read',
    'category:manage',
    'product:read',
    'product:manage',
    'product:inventory:manage',
    'order:read',
    'order:create',
    'order:manage',
    'payment:report',
    'payment:verify',
    'finance:read',
    'finance:manage',
    'kameti:read',
    'kameti:manage',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:manage',
    'service:request:read',
    'service:request:manage',
    'role:read',
    'role:change',
    'role:change:sensitive',
    'audit:read',
  ],
  COMMUNITY_ADMIN: [
    'community:read',
    'community:settings:manage',
    'community:members:update_role',
    'community:members:remove',
    'community:announcements:create',
    'community:announcements:publish',
    'member:read',
    'member:manage',
    'merchant:read',
    'merchant:manage',
    'merchant:apply',
    'merchant:verify',
    'merchant:suspend',
    'category:read',
    'category:manage',
    'product:read',
    'product:manage',
    'product:inventory:manage',
    'order:read',
    'order:create',
    'order:manage',
    'payment:report',
    'payment:verify',
    'finance:read',
    'kameti:read',
    'kameti:manage',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:manage',
    'service:request:read',
    'service:request:manage',
    'role:read',
    'role:change',
  ],
  COMMUNITY_MODERATOR: [
    'community:read',
    'community:announcements:create',
    'member:read',
    'merchant:read',
    'merchant:apply',
    'category:read',
    'product:read',
    'order:read',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:request:read',
    'role:read',
  ],
  COMMUNITY_FINANCE_MANAGER: [
    'community:read',
    'member:read',
    'finance:read',
    'finance:manage',
    'kameti:read',
    'kameti:manage',
    'order:read',
    'payment:verify',
    'service:read',
    'service:request:read',
    'role:read',
  ],
  MERCHANT: [
    'community:read',
    'merchant:read',
    'merchant:apply',
    'category:read',
    'category:manage',
    'product:read',
    'product:manage',
    'product:inventory:manage',
    'order:read',
    'order:create',
    'order:manage',
    'payment:report',
    'payment:verify',
    'finance:read',
    'finance:manage',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:manage',
    'service:request:read',
    'service:request:manage',
  ],
  MERCHANT_STAFF: [
    'community:read',
    'merchant:read',
    'merchant:apply',
    'category:read',
    'category:manage',
    'product:read',
    'product:inventory:manage',
    'order:read',
    'messaging:read',
    'service:read',
    'service:request:read',
  ],
  CUSTOMER: [
    'community:read',
    'merchant:apply',
    'category:read',
    'product:read',
    'order:read',
    'order:create',
    'order:manage',
    'payment:report',
    'messaging:read',
    'messaging:send',
    'service:read',
    'service:request:read',
    'service:request:manage',
    'kameti:read',
    'finance:read',
  ],
};
