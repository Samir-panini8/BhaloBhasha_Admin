import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from './Card'
import { colors, fonts, spacing } from '@/lib/theme'

interface Props {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'error'
  /** When given, the tile becomes a link to the queue or list it counts. */
  onPress?: () => void
}

export function StatTile({ label, value, hint, tone = 'default', onPress }: Props) {
  const body = (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.secondary} /> : null}
      </View>
      <Text style={[styles.value, tone !== 'default' && { color: toneColor[tone] }]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  )

  if (!onPress) return <Card style={styles.card}>{body}</Card>

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, styles.pressableCard, pressed && { opacity: 0.85 }]}>
      {body}
    </Pressable>
  )
}

const toneColor = {
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
} as const

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  pressableCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary },
  value: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.heading },
  hint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
})
