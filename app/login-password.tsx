import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import { digitsOnly } from '@/lib/digits'

// Peer of the OTP login screen — phone/email stay peer identifiers here too,
// the difference is proving control with a password instead of a fresh code.
// Mirrors the website's PasswordLoginForm.
export default function LoginPassword() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { loginWithPassword } = useAuth()

  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [countryCode, setCountryCode] = useState<'91' | '880'>('91')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneMaxLength = countryCode === '91' ? 10 : 11

  function handlePhoneChange(text: string) {
    setPhone(digitsOnly(text).slice(0, phoneMaxLength))
  }

  function handleCountryCode(next: '91' | '880') {
    setCountryCode(next)
    setPhone((current) => current.slice(0, next === '91' ? 10 : 11))
  }

  const canSubmit =
    password.length > 0 &&
    (method === 'phone' ? phone.length >= 10 : /\S+@\S+\.\S+/.test(email))

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await loginWithPassword(
        method === 'phone'
          ? { method: 'phone', phone, countryCode, password }
          : { method: 'email', email: email.trim(), password }
      )
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'লগইন করা যায়নি, আবার চেষ্টা করুন')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
        <Text style={styles.eyebrow}>Fair Bengal</Text>
        <Text style={styles.title}>পাসওয়ার্ড দিয়ে লগইন</Text>
        <Text style={styles.subtitle}>প্ল্যাটফর্ম অ্যাডমিন এবং স্টল অ্যাডমিনদের জন্য</Text>

        <View style={styles.segment}>
          <SegmentButton
            label="ইমেইল"
            active={method === 'email'}
            onPress={() => {
              setMethod('email')
              setError(null)
            }}
          />
          <SegmentButton
            label="ফোন নম্বর"
            active={method === 'phone'}
            onPress={() => {
              setMethod('phone')
              setError(null)
            }}
          />
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
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        )}

        <TextInput
          style={[styles.input, { marginTop: spacing.sm }]}
          placeholder="পাসওয়ার্ড"
          placeholderTextColor={colors.secondary}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={() => router.push('/forgot-password')} style={{ marginTop: spacing.sm, alignSelf: 'flex-end' }}>
          <Text style={styles.link}>পাসওয়ার্ড ভুলে গেছেন?</Text>
        </Pressable>

        <Button label="লগ ইন করুন" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={{ marginTop: spacing.lg }} />

        <Pressable onPress={() => router.replace('/login')} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
          <Text style={styles.link}>ওটিপি দিয়ে লগইন করুন →</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function SegmentButton({
  label,
  active,
  onPress,
  compact,
}: {
  label: string
  active: boolean
  onPress: () => void
  compact?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentBtn, compact && styles.segmentBtnCompact, active && styles.segmentBtnActive]}
    >
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
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.navy },
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md },
})
