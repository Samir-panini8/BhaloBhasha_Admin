import React from 'react'
import { Pressable, View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, spacing } from '@/lib/theme'

interface Props {
  title: string
  subtitle?: string
  right?: React.ReactNode
  onPress?: () => void
}

export function ListRow({ title, subtitle, right, onPress }: Props) {
  const content = (
    <>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.secondary} /> : null}
    </>
  )

  if (!onPress) {
    return <View style={styles.row}>{content}</View>
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.navyMist },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.heading },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
})
