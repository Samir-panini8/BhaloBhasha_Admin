import React from 'react'
import { Stack } from 'expo-router'
import { colors, fonts } from '@/lib/theme'

export default function CatalogLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.sansBold },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'ক্যাটালগ' }} />
      <Stack.Screen name="[id]" options={{ title: 'বিবরণ' }} />
    </Stack>
  )
}
