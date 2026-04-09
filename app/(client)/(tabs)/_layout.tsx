import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@/constants/theme';
import { config } from '@/constants/config';

export default function ClientTabsLayout() {
  const t = lightTheme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarStyle: {
          minHeight: config.tabBarHeight,
          backgroundColor: t.tabBar,
          borderTopColor: t.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
      }}>
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <FontAwesome name="search" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <FontAwesome name="calendar" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <FontAwesome name="user" color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
