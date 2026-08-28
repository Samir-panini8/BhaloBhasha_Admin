import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from './Card'
import { colors, fonts, spacing } from '@/lib/theme'

interface Props {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'error'
}

export function StatTile({ label, value, hint, tone = 'default' }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone !== 'default' && { color: toneColor[tone] }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  )
}

const toneColor = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
} as const

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary },
  value: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.heading },
  hint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
})
