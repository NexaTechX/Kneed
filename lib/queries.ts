export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  provider: (id: string) => ['provider', id] as const,
  providers: (params: Record<string, unknown>) => ['providers', params] as const,
  bookingsClient: () => ['bookings', 'client'] as const,
  bookingsProvider: () => ['bookings', 'provider'] as const,
  availability: (providerId: string, dateIso: string) => ['availability', providerId, dateIso] as const,
  earnings: (providerId: string, period: string) => ['earnings', providerId, period] as const,
  services: (providerId: string) => ['services', providerId] as const,
};
