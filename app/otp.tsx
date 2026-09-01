import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import type { OtpTarget } from '@/lib/auth-api'
import { digitsOnly } from '@/lib/digits'

export default function Otp() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ method: 'phone' | 'email'; phone?: string; countryCode?: '91' | '880'; email?: string }>()
  const { verifyOtp, requestOtp } = useAuth()

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target: OtpTarget =
    params.method === 'email'
      ? { method: 'email', email: params.email ?? '' }
      : { method: 'phone', phone: params.phone ?? '', countryCode: (params.countryCode as '91' | '880') ?? '91' }

  const destination = params.method === 'email' ? params.email : `+${params.countryCode} ${params.phone}`

  async function handleVerify() {
    if (otp.length < 4) return
    setError(null)
    setLoading(true)
    try {
      await verifyOtp({ ...target, otp } as any)
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ওটিপি যাচাই করা যায়নি')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    try {
      await requestOtp(target)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'আবার ওটিপি পাঠানো যায়নি')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
      <Text style={styles.title}>ওটিপি লিখুন</Text>
      <Text style={styles.subtitle}>{destination}-এ পাঠানো কোডটি লিখুন</Text>

      <TextInput
        style={styles.input}
        placeholder="——————"
        placeholderTextColor={colors.secondary}
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        value={otp}
        onChangeText={(text) => setOtp(digitsOnly(text).slice(0, 6))}
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="যাচাই করুন" onPress={handleVerify} loading={loading} disabled={otp.length < 4} style={{ marginTop: spacing.lg }} />

      <Pressable onPress={handleResend} disabled={resending} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
        <Text style={styles.resend}>{resending ? 'পাঠানো হচ্ছে...' : 'আবার কোড পাঠান'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment, paddingHorizontal: spacing.xl },
  title: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.heading },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.heading,
    backgroundColor: colors.white,
  },
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md, textAlign: 'center' },
  resend: { fontFamily: fonts.sansMedium, color: colors.navy, fontSize: 14 },
})
