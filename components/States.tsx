import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Button } from './Button'
import { colors, fonts, spacing } from '@/lib/theme'

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.navy} size="large" />
      {label ? <Text style={styles.caption}>{label}</Text> : null}
    </View>
  )
}

export function EmptyState({ icon = 'file-tray-outline', title, subtitle }: { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.secondary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.caption}>{subtitle}</Text> : null}
    </View>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="warning-outline" size={36} color={colors.error} />
      <Text style={styles.title}>কিছু একটা সমস্যা হয়েছে</Text>
      <Text style={styles.caption}>{message}</Text>
      {onRetry ? <Button label="আবার চেষ্টা করুন" onPress={onRetry} variant="secondary" style={{ marginTop: spacing.md }} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.heading, textAlign: 'center' },
  caption: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, textAlign: 'center' },
})
