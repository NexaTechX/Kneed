import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function PushTokenRegistrar() {
  const { user } = useAuth();
  const registeredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      registeredKey.current = null;
      return;
    }

    if (isRunningInExpoGo() && Platform.OS === 'android') {
      return;
    }

    let cancelled = false;

    void (async () => {
      const Notifications = await import('expo-notifications');

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      if (!Device.isDevice) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== 'granted' || cancelled) return;

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        const tokenRes = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenRes.data;
        if (!token || cancelled) return;
        if (registeredKey.current === token) return;

        const { error } = await supabase.from('push_tokens').upsert(
          { user_id: user.id, token },
          { onConflict: 'user_id,token' },
        );
        if (!error) registeredKey.current = token;
      } catch {
        // Missing EAS projectId or simulator limitations — safe to ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}
