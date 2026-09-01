import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import type { OtpTarget } from '@/lib/auth-api'
import { digitsOnly } from '@/lib/digits'

export default function Login() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { requestOtp } = useAuth()

  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [countryCode, setCountryCode] = useState<'91' | '880'>('91')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // +91 numbers are 10 digits, +880 mobiles 10 (without the leading 0) or 11.
  const phoneMaxLength = countryCode === '91' ? 10 : 11
  const phoneMinLength = 10

  // Digits only, everywhere. The numeric keypads still offer +, *, # and
  // spaces, and a paste can carry anything at all, so the value is filtered
  // on the way in rather than validated on the way out.
  function handlePhoneChange(text: string) {
    setPhone(digitsOnly(text).slice(0, phoneMaxLength))
  }

  function handleCountryCode(next: '91' | '880') {
    setCountryCode(next)
    // 11 digits typed for +880 must not silently survive a switch to +91.
    setPhone((current) => current.slice(0, next === '91' ? 10 : 11))
  }

  const canSubmit =
    method === 'phone' ? phone.length >= phoneMinLength && phone.length <= phoneMaxLength : /\S+@\S+\.\S+/.test(email)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const target: OtpTarget =
        method === 'phone' ? { method: 'phone', phone, countryCode } : { method: 'email', email: email.trim() }
      await requestOtp(target)
      router.push({ pathname: '/otp', params: { ...target } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ওটিপি পাঠানো যায়নি, আবার চেষ্টা করুন')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
        <Text style={styles.eyebrow}>ভালো ভাষা</Text>
        <Text style={styles.title}>অ্যাডমিন অ্যাপ</Text>
        <Text style={styles.subtitle}>প্ল্যাটফর্ম অ্যাডমিন এবং স্টল অ্যাডমিনদের জন্য</Text>

        <View style={styles.segment}>
          <SegmentButton label="ফোন নম্বর" active={method === 'phone'} onPress={() => setMethod('phone')} />
          <SegmentButton label="ইমেইল" active={method === 'email'} onPress={() => setMethod('email')} />
        </View>

        {method === 'phone' ? (
          <View style={styles.phoneRow}>
            <View style={styles.codePicker}>
              <SegmentButton label="+91" active={countryCode === '91'} onPress={() => handleCountryCode('91')} compact />
              <SegmentButton label="+880" active={countryCode === '880'} onPress={() => handleCountryCode('880')} compact />
            </View>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="ফোন নম্বর"
              placeholderTextColor={colors.secondary}
              keyboardType="number-pad"
              inputMode="numeric"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={phoneMaxLength}
              value={phone}
              onChangeText={handlePhoneChange}
            />
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="ইমেইল ঠিকানা"
            placeholderTextColor={colors.secondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="ওটিপি পাঠান" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={{ marginTop: spacing.lg }} />
      </View>
    </KeyboardAvoidingView>
  )
}

function SegmentButton({ label, active, onPress, compact }: { label: string; active: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentBtn, compact && styles.segmentBtnCompact, active && styles.segmentBtnActive]}>
      <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment, paddingHorizontal: spacing.xl },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.navyMid },
  title: { fontFamily: fonts.serifBold, fontSize: 30, color: colors.heading, marginTop: spacing.xs },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  segment: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  segmentBtnCompact: { flex: 0, paddingHorizontal: spacing.md },
  segmentBtnActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  segmentLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.body },
  segmentLabelActive: { color: colors.white },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  codePicker: { flexDirection: 'row', gap: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    color: colors.heading,
    backgroundColor: colors.white,
  },
  inputFlex: { flex: 1 },
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md },
})
