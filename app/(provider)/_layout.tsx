import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@/constants/theme';
import { config } from '@/constants/config';

export default function ProviderLayout() {
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <FontAwesome name="calendar" color={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <FontAwesome name="clock-o" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) => <FontAwesome name="list" color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <FontAwesome name="money" color={color} size={22} />,
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
