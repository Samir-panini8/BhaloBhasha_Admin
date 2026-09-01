import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/Button'
import { Section, TextField, ChoiceField } from '@/components/Field'
import { CoverUpload } from '@/components/ImageUpload'
import { LoadingView, ErrorState } from '@/components/States'
import { Badge } from '@/components/Badge'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { canAdministerOrg, ORG_TYPE_BN, ORG_ROLE_BN } from '@/lib/types'
import type { OrganizationDetail, OrgAccentTint, OrgRole } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

const TINTS: Array<{ value: OrgAccentTint; label: string }> = [
  { value: 'PAAN', label: 'পান' },
  { value: 'SINDOOR', label: 'সিঁদুর' },
  { value: 'GADA', label: 'গাঁদা' },
  { value: 'PORAMATI', label: 'পোড়ামাটি' },
  { value: 'SLATE', label: 'স্লেট' },
]

/**
 * The stall's own profile — name, blurb, contact, logo, cover, and the two
 * fields the invoice needs (pin code, GSTIN). Editing this used to be
 * website-only, which is why a stall changed on the site never seemed to
 * reach the app: the app had no idea the fields existed.
 */
export default function StallProfile() {
  const router = useRouter()
  const { refreshOrganizations } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<OrgRole>('VIEWER')
  const [org, setOrg] = useState<OrganizationDetail | null>(null)

  const [nameBn, setNameBn] = useState('')
  const [name, setName] = useState('')
  const [descriptionBn, setDescriptionBn] = useState('')
  const [ethosBn, setEthosBn] = useState('')
  const [locationBn, setLocationBn] = useState('')
  const [foundedYear, setFoundedYear] = useState('')
  const [accentTint, setAccentTint] = useState<OrgAccentTint>('PAAN')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [originPostalCode, setOriginPostalCode] = useState('')
  const [gstin, setGstin] = useState('')

  useEffect(() => {
    let alive = true
    api
      .get<{ data: OrganizationDetail; role: OrgRole }>('/api/publisher/organization')
      .then((res) => {
        if (!alive) return
        const d = res.data
        setOrg(d)
        setRole(res.role)
        setNameBn(d.nameBn ?? '')
        setName(d.name ?? '')
        setDescriptionBn(d.descriptionBn ?? '')
        setEthosBn(d.ethosBn ?? '')
        setLocationBn(d.locationBn ?? '')
        setFoundedYear(d.foundedYear != null ? String(d.foundedYear) : '')
        setAccentTint(d.accentTint ?? 'PAAN')
        setLogoUrl(d.logoUrl)
        setCoverImageUrl(d.coverImageUrl)
        setWebsite(d.website ?? '')
        setEmail(d.email ?? '')
        setPhone(d.phone ?? '')
        setOriginPostalCode(d.originPostalCode ?? '')
        setGstin(d.gstin ?? '')
        setLoadError(null)
      })
      .catch((err) => {
        if (alive) setLoadError(err instanceof ApiError ? err.message : 'স্টলের তথ্য লোড করা যায়নি')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function handleSave() {
    if (!nameBn.trim() || !name.trim()) {
      Alert.alert('নাম দিন', 'বাংলা ও ইংরেজি — দুটি নামই দরকার।')
      return
    }
    if (originPostalCode.trim() && !/^[1-9][0-9]{5}$/.test(originPostalCode.trim())) {
      Alert.alert('পিন কোড', 'পিন কোড ৬ সংখ্যার হতে হবে।')
      return
    }
    setSaving(true)
    try {
      // `null` clears a field server-side; an empty box means exactly that.
      await api.put('/api/publisher/organization', {
        nameBn: nameBn.trim(),
        name: name.trim(),
        descriptionBn: descriptionBn.trim(),
        ethosBn: ethosBn.trim() || null,
        locationBn: locationBn.trim() || null,
        foundedYear: foundedYear.trim() ? Number(foundedYear) : null,
        accentTint,
        logoUrl,
        coverImageUrl,
        website: website.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        originPostalCode: originPostalCode.trim() || null,
        gstin: gstin.trim() || null,
      })
      // The tab bar, the switcher and the "আরও" header all read the stall
      // list, so it has to be re-read here or the old name lingers.
      await refreshOrganizations()
      Alert.alert('সংরক্ষিত হয়েছে', 'স্টলের তথ্য আপডেট হয়েছে।', [{ text: 'ঠিক আছে', onPress: () => router.back() }])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'সংরক্ষণে সমস্যা হয়েছে'
      const body = err instanceof ApiError ? (err.body as any)?.error : null
      const fieldErrors = body?.fieldErrors
        ? Object.entries(body.fieldErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join('\n')
        : ''
      Alert.alert('সংরক্ষণ করা যায়নি', fieldErrors || message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingView />
  if (loadError) return <ErrorState message={loadError} />

  const canEdit = canAdministerOrg(role)

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <ScreenHeader title="স্টল প্রোফাইল" subtitle={org ? ORG_TYPE_BN[org.type] : undefined} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.statusRow}>
            <Badge label={org?.isVerified ? 'যাচাইকৃত' : 'যাচাই হয়নি'} tone={org?.isVerified ? 'success' : 'neutral'} />
            <Badge label={org?.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} tone={org?.isActive ? 'success' : 'error'} />
            <Badge label={ORG_ROLE_BN[role]} tone="navy" />
          </View>
          {!canEdit ? (
            <Text style={styles.note}>আপনার সিটে স্টল সম্পাদনার অনুমতি নেই — মালিক বা অ্যাডমিন বদলাতে পারেন।</Text>
          ) : null}

          <Section title="পরিচয়">
            <CoverUpload value={logoUrl} onChange={setLogoUrl} folder="general" label="লোগো" />
            <CoverUpload value={coverImageUrl} onChange={setCoverImageUrl} folder="general" label="কভার ছবি" />
            <TextField label="স্টলের নাম (বাংলা)" required value={nameBn} onChangeText={setNameBn} editable={canEdit} />
            <TextField label="Name (English)" required value={name} onChangeText={setName} editable={canEdit} autoCapitalize="words" />
            <TextField
              label="এক লাইনের কথা"
              placeholder="যেমন: ছোটদের বই, বড়দের মন"
              maxLength={160}
              value={ethosBn}
              onChangeText={setEthosBn}
              editable={canEdit}
            />
            <TextField label="পরিচিতি" multiline value={descriptionBn} onChangeText={setDescriptionBn} editable={canEdit} />
            <TextField label="ঠিকানার এলাকা" maxLength={120} value={locationBn} onChangeText={setLocationBn} editable={canEdit} />
            <TextField label="প্রতিষ্ঠার বছর" numeric maxLength={4} value={foundedYear} onChangeText={setFoundedYear} editable={canEdit} />
            <ChoiceField label="রঙের ছোঁয়া" value={accentTint} options={TINTS} onChange={setAccentTint} />
          </Section>

          <Section title="যোগাযোগ">
            <TextField label="ওয়েবসাইট" placeholder="https://..." value={website} onChangeText={setWebsite} editable={canEdit} autoCapitalize="none" />
            <TextField label="ইমেইল" value={email} onChangeText={setEmail} editable={canEdit} autoCapitalize="none" keyboardType="email-address" />
            <TextField label="ফোন" value={phone} onChangeText={setPhone} editable={canEdit} keyboardType="phone-pad" />
          </Section>

          <Section title="চালান ও কুরিয়ার" hint="পিন কোড না দিলে কুরিয়ার খরচ সবচেয়ে দূরের জোনে ধরা হয়।">
            <TextField label="পিন কোড" numeric maxLength={6} value={originPostalCode} onChangeText={setOriginPostalCode} editable={canEdit} />
            <TextField
              label="জিএসটিআইএন"
              maxLength={15}
              autoCapitalize="characters"
              value={gstin}
              onChangeText={setGstin}
              editable={canEdit}
            />
          </Section>

          {canEdit ? <Button label="সংরক্ষণ করুন" onPress={handleSave} loading={saving} /> : null}
          <Button label="ফিরে যান" variant="secondary" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  statusRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  note: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
})
