import * as Location from 'expo-location';

/** Forward-geocode an address to coordinates (uses platform geocoder). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;
  try {
    const results = await Location.geocodeAsync(trimmed);
    const first = results[0];
    if (!first) return null;
    return { lat: first.latitude, lng: first.longitude };
  } catch {
    return null;
  }
}
