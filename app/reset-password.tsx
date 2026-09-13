import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import { digitsOnly } from '@/lib/digits'

const PASSWORD_MIN = 8

export default function ResetPassword() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{
    method: 'phone' | 'email'
    phone?: string
    countryCode?: '91' | '880'
    email?: string
  }>()
  const { resetPassword, forgotPassword } = useAuth()

  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destination =
    params.method === 'email' ? params.email : `+${params.countryCode} ${params.phone}`

  const canSubmit = otp.length >= 4 && newPassword.length >= PASSWORD_MIN

  async function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      if (params.method === 'email') {
        await resetPassword({ method: 'email', email: params.email ?? '', otp, newPassword })
      } else {
        await resetPassword({
          method: 'phone',
          phone: params.phone ?? '',
          countryCode: (params.countryCode as '91' | '880') ?? '91',
          otp,
          newPassword,
        })
      }
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'পাসওয়ার্ড পরিবর্তন করা যায়নি')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    setError(null)
    try {
      if (params.method === 'email') {
        await forgotPassword({ method: 'email', email: params.email ?? '' })
      } else {
        await forgotPassword({
          method: 'phone',
          phone: params.phone ?? '',
          countryCode: (params.countryCode as '91' | '880') ?? '91',
        })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'আবার কোড পাঠানো যায়নি')
    } finally {
      setResending(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
      <Text style={styles.title}>নতুন পাসওয়ার্ড দিন</Text>
      <Text style={styles.subtitle}>{destination}-এ পাঠানো কোডটি ও নতুন পাসওয়ার্ড লিখুন</Text>

      <TextInput
        style={styles.otpInput}
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

      <TextInput
        style={[styles.input, { marginTop: spacing.md }]}
        placeholder={`নতুন পাসওয়ার্ড (কমপক্ষে ${PASSWORD_MIN} অক্ষর)`}
        placeholderTextColor={colors.secondary}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="পাসওয়ার্ড সেট করুন" onPress={handleSubmit} loading={loading} disabled={!canSubmit} style={{ marginTop: spacing.lg }} />

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
  otpInput: {
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
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md, textAlign: 'center' },
  resend: { fontFamily: fonts.sansMedium, color: colors.navy, fontSize: 14 },
})
