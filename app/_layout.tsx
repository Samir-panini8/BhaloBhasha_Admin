import 'react-native-gesture-handler'
import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali'
import { NotoSerifBengali_400Regular, NotoSerifBengali_500Medium, NotoSerifBengali_700Bold } from '@expo-google-fonts/noto-serif-bengali'
import { AuthProvider } from '@/lib/auth-context'
import { LoadingView } from '@/components/States'
import { colors } from '@/lib/theme'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSansBengali_400Regular,
    NotoSansBengali_500Medium,
    NotoSansBengali_700Bold,
    NotoSerifBengali_400Regular,
    NotoSerifBengali_500Medium,
    NotoSerifBengali_700Bold,
  })

  if (!fontsLoaded) {
    return <LoadingView />
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.parchment } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="login-password" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="persona-switcher" />
            <Stack.Screen name="(platform-admin)" />
            <Stack.Screen name="(stall-admin)" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
