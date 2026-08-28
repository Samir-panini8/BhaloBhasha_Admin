import React from 'react'
import { Pressable, StyleSheet, ActivityIndicator, Text, ViewStyle } from 'react-native'
import { colors, fonts, radius, spacing } from '@/lib/theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface Props {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.navy : colors.white} />
      ) : (
        <Text style={[styles.label, textStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minHeight: 48,
  },
  label: { fontFamily: fonts.sansBold, fontSize: 15 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
})

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.navy },
  secondary: { backgroundColor: colors.navyMist, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.error },
  ghost: { backgroundColor: 'transparent' },
})

const textStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.navy },
  danger: { color: colors.white },
  ghost: { color: colors.navy },
})
