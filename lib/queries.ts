/**
 * Central registry of React Query keys. Use these instead of inline string arrays so
 * a query and its invalidations can never drift apart.
 *
 * Note: some screens invalidate by the bare root (e.g. ['feed-posts']) to refresh every
 * user's cache entry. React Query matches by prefix, so the `*Root` keys below are valid
 * invalidation targets for their parameterized counterparts.
 */
export const queryKeys = {
  feed: (userId?: string) => ['feed-posts', userId] as const,
  feedRoot: ['feed-posts'] as const,
  postAccessGrants: (userId?: string) => ['post-access-grants', userId] as const,
  postAccessGrantsRoot: ['post-access-grants'] as const,
  socialFollowing: (userId?: string) => ['social-following', userId] as const,
  profileSocial: (userId?: string) => ['profile-social', userId] as const,
  myPosts: (userId?: string) => ['my-posts', userId] as const,
  postComments: (postId?: string) => ['post-comments', postId] as const,
  editPost: (postId?: string, userId?: string) => ['edit-post', postId, userId] as const,

  notifications: (userId?: string) => ['notifications', userId] as const,
  notificationsUnread: (userId?: string) => ['notifications-unread', userId] as const,

  walletAccount: (userId?: string) => ['wallet-account', userId] as const,
  walletLedger: (userId?: string) => ['wallet-ledger', userId] as const,
  withdrawals: (userId?: string) => ['withdrawals', userId] as const,

  privateRoomSessions: (userId?: string) => ['private-room-sessions', userId] as const,
  privateRoomDiscover: (userId?: string) => ['private-room-discover', userId] as const,
  creatorProfile: (id?: string) => ['creator-profile', id] as const,
  creatorStats: (id?: string, userId?: string) => ['creator-stats', id, userId] as const,

  kycLatest: (userId?: string) => ['kyc-latest', userId] as const,
  search: (q: string) => ['search', q] as const,
};
