import React from 'react'
import { Text as RNText, TextProps, View, ViewProps, StyleSheet } from 'react-native'
import { colors, fonts } from '@/lib/theme'

export function Screen({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.screen, style]} />
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[styles.text, style]} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment },
  text: { fontFamily: fonts.sansRegular, color: colors.body },
})
