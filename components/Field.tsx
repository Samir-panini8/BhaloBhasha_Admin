import React from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, Switch, TextInputProps } from 'react-native'
import { colors, fonts, radius, spacing } from '@/lib/theme'

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      <View style={{ gap: spacing.md }}>{children}</View>
    </View>
  )
}

interface FieldProps extends TextInputProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  /** Digits only, stripped as typed — used for every numeric field. */
  numeric?: boolean
  /** Allows one decimal point (GST rate). Implies numeric. */
  decimal?: boolean
}

export function TextField({ label, required, error, hint, numeric, decimal, onChangeText, ...rest }: FieldProps) {
  const isNumeric = numeric || decimal

  const handleChange = (text: string) => {
    if (!onChangeText) return
    if (!isNumeric) return onChangeText(text)
    // Strip anything the numeric keypads still let through (+, *, #, spaces,
    // Bengali digits pasted from elsewhere) instead of failing at submit.
    let cleaned = text.replace(/[^0-9.]/g, '')
    if (!decimal) cleaned = cleaned.replace(/\./g, '')
    else {
      const [head, ...tail] = cleaned.split('.')
      cleaned = tail.length ? `${head}.${tail.join('')}` : head
    }
    onChangeText(cleaned)
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        {...rest}
        onChangeText={handleChange}
        keyboardType={rest.keyboardType ?? (isNumeric ? (decimal ? 'decimal-pad' : 'number-pad') : 'default')}
        placeholderTextColor={colors.secondary}
        style={[styles.input, rest.multiline && styles.inputMultiline, !!error && styles.inputError, rest.style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

export function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  disabled,
}: {
  label: string
  hint?: string
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.navyMid }}
        thumbColor={colors.white}
      />
    </View>
  )
}

export function Chip({
  label,
  active,
  onPress,
  tone = 'navy',
}: {
  label: string
  active?: boolean
  onPress: () => void
  tone?: 'navy' | 'danger'
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && (tone === 'danger' ? styles.chipActiveDanger : styles.chipActive),
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </Pressable>
  )
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>
}

/** A labelled row of mutually exclusive chips — the app's stand-in for <select>. */
export function ChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ChipRow>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </ChipRow>
    </View>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <Text style={styles.error}>{message}</Text>
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.heading },
  sectionHint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, marginTop: -spacing.sm },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary },
  required: { color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    color: colors.heading,
    backgroundColor: colors.white,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: 11 },
  inputError: { borderColor: colors.error },
  error: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.error },
  hint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.heading },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipActiveDanger: { backgroundColor: colors.error, borderColor: colors.error },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.body },
  chipLabelActive: { color: colors.white },
  pressed: { opacity: 0.8 },
})
