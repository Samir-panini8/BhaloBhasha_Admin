import React from 'react'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts } from '@/lib/theme'

export default function PlatformAdminLayout() {
  const { status, persona } = useAuth()

  if (status === 'loading') return null
  if (status === 'signedOut') return <Redirect href="/login" />
  if (persona?.kind !== 'platform-admin') return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'হোম', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'অর্ডার', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="moderation"
        options={{ title: 'মডারেশন', tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'রিপোর্ট', tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="stalls"
        options={{ title: 'স্টল', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'আরও', tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
