import React from 'react'
import { Stack } from 'expo-router'
import { colors, fonts } from '@/lib/theme'

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.sansBold },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'রিপোর্ট' }} />
      <Stack.Screen name="[id]" options={{ title: 'রিপোর্ট পর্যালোচনা' }} />
    </Stack>
  )
}
