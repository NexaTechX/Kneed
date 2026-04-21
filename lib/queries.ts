export const queryKeys = {
  feed: () => ['feed-posts'] as const,
  wallet: (userId: string) => ['wallet-account', userId] as const,
};
