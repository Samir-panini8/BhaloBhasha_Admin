import React from 'react'
import { Stack } from 'expo-router'
import { colors, fonts } from '@/lib/theme'

export default function StallsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.sansBold },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'স্টল' }} />
      <Stack.Screen name="[id]" options={{ title: 'স্টল বিবরণ' }} />
      <Stack.Screen name="application/[id]" options={{ title: 'আবেদন পর্যালোচনা' }} />
    </Stack>
  )
}
