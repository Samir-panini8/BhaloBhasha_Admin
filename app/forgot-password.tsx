import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import { digitsOnly } from '@/lib/digits'

// Response from the backend is uniform whether or not the identifier has an
// account, so this screen always moves on to /reset-password on submit —
// never branches copy on "found" vs "not found".
export default function ForgotPassword() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { forgotPassword } = useAuth()

  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [countryCode, setCountryCode] = useState<'91' | '880'>('91')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phoneMaxLength = countryCode === '91' ? 10 : 11

  function handlePhoneChange(text: string) {
    setPhone(digitsOnly(text).slice(0, phoneMaxLength))
  }

  const canSubmit = method === 'phone' ? phone.length >= 10 : /\S+@\S+\.\S+/.test(email)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const target =
        method === 'phone'
          ? ({ method: 'phone', phone, countryCode } as const)
          : ({ method: 'email', email: email.trim() } as const)
      await forgotPassword(target)
      router.push({ pathname: '/reset-password', params: target })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'কোড পাঠানো যায়নি, আবার চেষ্টা করুন')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
      <Text style={styles.title}>পাসওয়ার্ড ভুলে গেছেন?</Text>
      <Text style={styles.subtitle}>যে ইমেইল বা ফোন নম্বর দিয়ে অ্যাকাউন্ট খোলা হয়েছে তা লিখুন — একটি কোড পাঠানো হবে</Text>

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
            <SegmentButton label="+91" active={countryCode === '91'} onPress={() => setCountryCode('91')} compact />
            <SegmentButton label="+880" active={countryCode === '880'} onPress={() => setCountryCode('880')} compact />
          </View>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="ফোন নম্বর"
            placeholderTextColor={colors.secondary}
            keyboardType="number-pad"
            inputMode="numeric"
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

      <Button label="কোড পাঠান" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={{ marginTop: spacing.lg }} />

      <Pressable onPress={() => router.back()} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
        <Text style={styles.link}>← ফিরে যান</Text>
      </Pressable>
    </View>
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
  title: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.heading },
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
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.navy },
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md },
})
