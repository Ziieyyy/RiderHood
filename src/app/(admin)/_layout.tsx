import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { COLORS } from '../../constants/theme';
import { Home, Users, Wrench, BarChart3, Settings, LogOut, CalendarDays, Layers, Package, Star, Bell } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../context/AuthContext';

export default function AdminDrawerLayout() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.surfaceContainer, borderBottomWidth: 1, borderBottomColor: COLORS.border },
        headerTintColor: COLORS.textPrimary,
        drawerActiveBackgroundColor: COLORS.primaryDark,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
        drawerStyle: { backgroundColor: COLORS.surface, width: 280 },
        sceneStyle: { backgroundColor: COLORS.background },
        headerRight: () => (
          <TouchableOpacity 
            style={{ marginRight: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.dangerBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.danger }}
            onPress={logout}
          >
            <LogOut color={COLORS.danger} size={16} />
          </TouchableOpacity>
        ),
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Command Center',
          title: 'Command Center',
          drawerIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          drawerLabel: 'User Management',
          title: 'Users',
          drawerIcon: ({ color }) => <Users color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="workshops"
        options={{
          drawerLabel: 'Workshops',
          title: 'Workshops',
          drawerIcon: ({ color }) => <Wrench color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="bookings"
        options={{
          drawerLabel: 'Bookings',
          title: 'Bookings',
          drawerIcon: ({ color }) => <CalendarDays color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="services"
        options={{
          drawerLabel: 'Services',
          title: 'Services',
          drawerIcon: ({ color }) => <Layers color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="parts"
        options={{
          drawerLabel: 'Parts & Inventory',
          title: 'Parts',
          drawerIcon: ({ color }) => <Package color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reviews"
        options={{
          drawerLabel: 'Reviews',
          title: 'Reviews',
          drawerIcon: ({ color }) => <Star color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="notifications"
        options={{
          drawerLabel: 'Notifications',
          title: 'Notifications',
          drawerIcon: ({ color }) => <Bell color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: 'Reports & Analytics',
          title: 'Reports',
          drawerIcon: ({ color }) => <BarChart3 color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'System Settings',
          title: 'Settings',
          drawerIcon: ({ color }) => <Settings color={color} size={20} />,
        }}
      />
    </Drawer>
  );
}
