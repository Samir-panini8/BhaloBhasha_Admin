import React from 'react'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts } from '@/lib/theme'

export default function StallAdminLayout() {
  const { status, persona } = useAuth()

  if (status === 'loading') return null
  if (status === 'signedOut') return <Redirect href="/login" />
  if (persona?.kind !== 'stall') return <Redirect href="/" />

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
        options={{ title: 'ড্যাশবোর্ড', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="catalog"
        options={{ title: 'ক্যাটালগ', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="revenue"
        options={{ title: 'আয়', tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'আরও', tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
