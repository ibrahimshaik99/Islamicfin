export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface TestCommunity {
  id: string;
  name: string;
  slug: string;
}

export interface TestMembership {
  id: string;
  communityId: string;
  userId: string;
  role: string;
  status: string;
}

export const TEST_USERS = {
  userA: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'User A',
    email: 'user-a@test.com',
    password: 'Password123!',
  } as TestUser,
  userB: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'User B',
    email: 'user-b@test.com',
    password: 'Password123!',
  } as TestUser,
  userC: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'User C (No Community)',
    email: 'user-c@test.com',
    password: 'Password123!',
  } as TestUser,
};

export const TEST_COMMUNITIES = {
  communityA: {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Community A',
    slug: 'community-a',
  } as TestCommunity,
  communityB: {
    id: '00000000-0000-0000-0000-000000000020',
    name: 'Community B',
    slug: 'community-b',
  } as TestCommunity,
};

export const TEST_MEMBERSHIPS = {
  userAinA: {
    id: '00000000-0000-0000-0000-000000000030',
    communityId: TEST_COMMUNITIES.communityA.id,
    userId: TEST_USERS.userA.id,
    role: 'COMMUNITY_OWNER',
    status: 'ACTIVE',
  } as TestMembership,
  userBinB: {
    id: '00000000-0000-0000-0000-000000000031',
    communityId: TEST_COMMUNITIES.communityB.id,
    userId: TEST_USERS.userB.id,
    role: 'COMMUNITY_OWNER',
    status: 'ACTIVE',
  } as TestMembership,
};

export const TEST_SESSIONS = {
  sessionUserA: 'test-session-token-user-a',
  sessionUserB: 'test-session-token-user-b',
  sessionUserC: 'test-session-token-user-c',
};
