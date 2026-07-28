import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { COLORS } from '../../constants/theme';
import {
  LayoutDashboard,
  CalendarDays,
  Wrench,
  Package,
  Users,
  Star,
  Building2,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function WorkshopDrawerLayout() {
  const router = useRouter();
  const { logout, profile } = useAuth();

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.surfaceContainer,
          borderBottomWidth: 1,
          borderBottomColor: '#3b2f10',
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '800',
        },
        drawerActiveBackgroundColor: '#3b2f10',
        drawerActiveTintColor: '#f59e0b',
        drawerInactiveTintColor: COLORS.textSecondary,
        drawerStyle: {
          backgroundColor: COLORS.surface,
          width: 280,
        },
        sceneStyle: { backgroundColor: COLORS.background },
        headerRight: () => (
          <TouchableOpacity
            style={{
              marginRight: 16,
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: COLORS.dangerBg,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: COLORS.danger,
            }}
            onPress={logout}
          >
            <LogOut color={COLORS.danger} size={16} />
          </TouchableOpacity>
        ),
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          drawerLabel: 'Workshop Dashboard',
          title: profile?.full_name || 'Apex Moto Dashboard',
          drawerIcon: ({ color }) => <LayoutDashboard color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="bookings"
        options={{
          drawerLabel: 'Bookings Queue',
          title: 'Bookings Management',
          drawerIcon: ({ color }) => <CalendarDays color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="services"
        options={{
          drawerLabel: 'Service Packages',
          title: 'Service Catalog',
          drawerIcon: ({ color }) => <Wrench color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="parts"
        options={{
          drawerLabel: 'Parts & Stock',
          title: 'Parts Inventory',
          drawerIcon: ({ color }) => <Package color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="customers"
        options={{
          drawerLabel: 'Customer Directory',
          title: 'Customers',
          drawerIcon: ({ color }) => <Users color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reviews"
        options={{
          drawerLabel: 'Reviews & Feedback',
          title: 'Customer Reviews',
          drawerIcon: ({ color }) => <Star color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'Workshop Profile',
          title: 'Workshop Details & Hours',
          drawerIcon: ({ color }) => <Building2 color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: 'Reports & Revenue',
          title: 'Workshop Analytics',
          drawerIcon: ({ color }) => <BarChart3 color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Workshop Settings',
          drawerIcon: ({ color }) => <Settings color={color} size={20} />,
        }}
      />
    </Drawer>
  );
}
