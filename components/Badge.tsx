import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts, radius, spacing } from '@/lib/theme'

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'navy'

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.navyMist, fg: colors.secondary },
  success: { bg: colors.successLight, fg: colors.success },
  warning: { bg: '#FBF0DD', fg: colors.warning },
  error: { bg: '#FBE7E7', fg: colors.error },
  navy: { bg: colors.navyMist, fg: colors.navy },
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = toneStyles[tone]
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  label: { fontFamily: fonts.sansMedium, fontSize: 12 },
})
