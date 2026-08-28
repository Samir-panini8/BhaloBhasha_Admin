import React from 'react'
import { Stack } from 'expo-router'
import { colors, fonts } from '@/lib/theme'

export default function ModerationLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.sansBold },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'মডারেশন সারি' }} />
      <Stack.Screen name="[id]" options={{ title: 'পর্যালোচনা' }} />
    </Stack>
  )
}
