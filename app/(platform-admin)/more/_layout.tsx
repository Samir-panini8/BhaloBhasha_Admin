import React from 'react'
import { Stack } from 'expo-router'
import { colors, fonts } from '@/lib/theme'

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.sansBold },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'আরও' }} />
      <Stack.Screen name="users/index" options={{ title: 'ব্যবহারকারী' }} />
      <Stack.Screen name="users/[id]" options={{ title: 'প্রোফাইল' }} />
    </Stack>
  )
}
