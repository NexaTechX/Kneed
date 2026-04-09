/** Map common Supabase / trigger errors to user-facing copy. */
export function friendlyBookingError(message: string): string {
  if (message.includes('24 hours')) {
    return 'Cancellations must be at least 24 hours before your session.';
  }
  if (message.toLowerCase().includes('pay before') || message.includes('must pay')) {
    return 'The client must pay before you can confirm this booking.';
  }
  return message;
}
