import React from 'react'
import { View, ViewProps, StyleSheet } from 'react-native'
import { colors, radius, spacing } from '@/lib/theme'

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
