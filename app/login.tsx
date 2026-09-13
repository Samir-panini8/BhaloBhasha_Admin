import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/api'
import { colors, fonts, radius, spacing } from '@/lib/theme'
import { fetchOtpTransports, type OtpTarget } from '@/lib/auth-api'
import { digitsOnly } from '@/lib/digits'

// A DELIVERY choice, never an identity: both transports key the OTP on the
// same E.164 number and match the same account (mirrors the website's
// LoginForm — see its comment for why).
type Transport = 'whatsapp' | 'sms'

export default function Login() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { requestOtp } = useAuth()

  // Which transports the server currently has switched on. Unlike the
  // website, which reads this in a server component before the page ever
  // renders, a native client has to ask — see fetchOtpTransports. Optimistic
  // defaults (both true) avoid a loading flash; a wrong guess just means the
  // real send-otp call 503s with an honest reason.
  const [smsAvailable, setSmsAvailable] = useState(true)
  const [whatsappAvailable, setWhatsappAvailable] = useState(true)

  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [transport, setTransport] = useState<Transport>('whatsapp')
  const [countryCode, setCountryCode] = useState<'91' | '880'>('91')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when the server said the phone transport itself cannot deliver
  // (gateway down, template missing) — a resend will not help, email will.
  const [offerEmail, setOfferEmail] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchOtpTransports()
      .then(({ data }) => {
        if (cancelled) return
        setSmsAvailable(data.smsAvailable)
        setWhatsappAvailable(data.whatsappAvailable)
        if (!data.whatsappAvailable && data.smsAvailable) setTransport('sms')
        if (!data.whatsappAvailable && !data.smsAvailable) setMethod('email')
      })
      .catch(() => {
        // Best-effort — the form keeps its optimistic defaults and any
        // actually-off transport surfaces via the 503 from send-otp instead.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const phoneAvailable = smsAvailable || whatsappAvailable
  // Exotel is India-first; +880 SMS is refused by the server with a 503.
  // WhatsApp has no such limit — Meta delivers across the border.
  const phoneUnsupportedHere = method === 'phone' && transport === 'sms' && countryCode === '880'

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

  function clearFeedback() {
    setError(null)
    setOfferEmail(false)
  }

  async function handleSubmit() {
    clearFeedback()
    setLoading(true)
    try {
      const target: OtpTarget =
        method === 'phone'
          ? { method: transport === 'whatsapp' ? 'whatsapp' : 'phone', phone, countryCode }
          : { method: 'email', email: email.trim() }
      await requestOtp(target)
      router.push({ pathname: '/otp', params: { ...target } })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        // 503 from deliverPhoneOtp carries fallbackToEmail when a resend
        // won't help but email will (gateway down, template missing).
        setOfferEmail(method === 'phone' && (err.body as { fallbackToEmail?: boolean } | undefined)?.fallbackToEmail === true)
      } else {
        setError('ওটিপি পাঠানো যায়নি, আবার চেষ্টা করুন')
      }
    } finally {
      setLoading(false)
    }
  }

  // Named for WhatsApp when that transport is on, because that is what the
  // admin is actually choosing — same rule as the website's login form.
  const phoneTabLabel = whatsappAvailable ? 'WhatsApp' : 'ফোন নম্বর'
  const transportLabel = transport === 'whatsapp' ? 'WhatsApp' : 'SMS'

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
        <Text style={styles.eyebrow}>Fair Bengal</Text>
        <Text style={styles.title}>অ্যাডমিন অ্যাপ</Text>
        <Text style={styles.subtitle}>প্ল্যাটফর্ম অ্যাডমিন এবং স্টল অ্যাডমিনদের জন্য</Text>

        <View style={styles.segment}>
          <SegmentButton
            label={phoneTabLabel}
            active={method === 'phone'}
            onPress={() => {
              if (!phoneAvailable) return
              setMethod('phone')
              clearFeedback()
            }}
            disabled={!phoneAvailable}
          />
          <SegmentButton
            label="ইমেইল"
            active={method === 'email'}
            onPress={() => {
              setMethod('email')
              clearFeedback()
            }}
          />
        </View>

        {!phoneAvailable && (
          <Text style={styles.hint}>ফোনে ওটিপি এখন উপলব্ধ নয় — ইমেইল দিয়ে লগইন করুন</Text>
        )}

        {method === 'phone' ? (
          <>
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

            {/* The transport choice renders only when there IS a choice —
                with one transport on, one line says where the code will go. */}
            {smsAvailable && whatsappAvailable ? (
              <View style={styles.segment}>
                <SegmentButton
                  label="WhatsApp"
                  active={transport === 'whatsapp'}
                  onPress={() => {
                    setTransport('whatsapp')
                    clearFeedback()
                  }}
                  compact
                />
                <SegmentButton
                  label="SMS"
                  active={transport === 'sms'}
                  onPress={() => {
                    setTransport('sms')
                    clearFeedback()
                  }}
                  compact
                />
              </View>
            ) : (
              <Text style={styles.hint}>কোডটি {transportLabel}-এ যাবে</Text>
            )}

            {transport === 'whatsapp' && (
              <Text style={styles.hint}>
                কোডটি আসবে Cheenta-র WhatsApp নম্বর থেকে
              </Text>
            )}

            {phoneUnsupportedHere && !error && (
              <Text style={styles.warning}>
                বাংলাদেশে এখন SMS-এ ওটিপি পাঠানো যাচ্ছে না —{' '}
                {whatsappAvailable ? 'WhatsApp বা ইমেইল' : 'ইমেইল'} দিয়ে লগইন করুন
              </Text>
            )}
          </>
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

        {offerEmail && (
          <Pressable
            onPress={() => {
              setMethod('email')
              clearFeedback()
            }}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={styles.link}>ইমেইল দিয়ে লগইন করুন →</Text>
          </Pressable>
        )}

        <Button label="ওটিপি পাঠান" onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={{ marginTop: spacing.lg }} />

        <Pressable onPress={() => router.push('/login-password')} style={{ marginTop: spacing.lg, alignSelf: 'center' }}>
          <Text style={styles.link}>পাসওয়ার্ড দিয়ে লগইন করুন →</Text>
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
  disabled,
}: {
  label: string
  active: boolean
  onPress: () => void
  compact?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.segmentBtn,
        compact && styles.segmentBtnCompact,
        active && styles.segmentBtnActive,
        disabled && styles.segmentBtnDisabled,
      ]}
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
  segmentBtnDisabled: { opacity: 0.45 },
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
  hint: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.sm },
  warning: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.error, marginTop: spacing.xs },
  link: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.navy },
  error: { fontFamily: fonts.sansMedium, color: colors.error, marginTop: spacing.md },
})
