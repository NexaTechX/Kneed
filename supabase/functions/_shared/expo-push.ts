/** Send messages via Expo Push API (works with Expo push tokens from expo-notifications). */

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
};

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Expo push HTTP error', res.status, text);
    return;
  }

  const json = (await res.json()) as { data?: { status?: string; message?: string }[] };
  const errors = json.data?.filter((d) => d.status === 'error') ?? [];
  if (errors.length > 0) {
    console.error('Expo push ticket errors', errors);
  }
}
