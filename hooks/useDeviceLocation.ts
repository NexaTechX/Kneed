import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export function useDeviceLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is off. You can enter coordinates manually below.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      setError('Could not read GPS. Try manual coordinates.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { refresh, loading, error, setError };
}
