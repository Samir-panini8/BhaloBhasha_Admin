import React, { useMemo, useState } from 'react'
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { api, ApiError } from '@/lib/api'
import { colors, fonts, spacing } from '@/lib/theme'

interface AppItem {
  id: string
  nameBn: string
  nameEn: string
  type: string
  country: string
  phone: string
  email: string | null
  website: string | null
  registrationNumber: string | null
  representativeBooks: string | null
  description: string
}

const ORG_TYPE_BN: Record<string, string> = {
  PUBLISHER: 'প্রকাশনা',
  SELLER: 'বিক্রেতা',
  PUBLISHER_AND_SELLER: 'প্রকাশনা ও বিক্রয়',
  ARTIST: 'রঙ্গ (শিল্পী)',
  ARTISAN: 'সোনাঝুরি (কারিগর)',
}

export default function ApplicationDetailScreen() {
  const { id, item: itemParam } = useLocalSearchParams<{ id: string; item?: string }>()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVE' | 'REJECT' | null>(null)

  const app: AppItem | null = useMemo(() => {
    try {
      return itemParam ? (JSON.parse(itemParam) as AppItem) : null
    } catch {
      return null
    }
  }, [itemParam])

  async function act(action: 'APPROVE' | 'REJECT') {
    setSubmitting(action)
    try {
      await api.put(`/api/admin/publisher-apps/${id}`, { action, note: note.trim() || undefined })
      router.back()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setSubmitting(null)
    }
  }

  if (!app) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>আবেদনের বিবরণ পাওয়া যায়নি</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{app.nameBn}</Text>
      <Badge label={ORG_TYPE_BN[app.type] ?? app.type} tone="navy" />

      <Card style={{ gap: spacing.xs }}>
        <Field label="ইংরেজি নাম" value={app.nameEn} />
        <Field label="দেশ" value={app.country} />
        <Field label="ফোন" value={app.phone} />
        <Field label="ইমেইল" value={app.email ?? '—'} />
        <Field label="ওয়েবসাইট" value={app.website ?? '—'} />
        <Field label="নিবন্ধন নম্বর" value={app.registrationNumber ?? '—'} />
      </Card>

      {app.description ? (
        <Card>
          <Text style={styles.fieldLabel}>বিবরণ</Text>
          <Text style={styles.body}>{app.description}</Text>
        </Card>
      ) : null}

      <TextInput
        style={styles.textArea}
        placeholder="অনুমোদন/প্রত্যাখ্যানের মন্তব্য (ঐচ্ছিক)"
        placeholderTextColor={colors.secondary}
        multiline
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.actions}>
        <Button label="অনুমোদন করুন" onPress={() => act('APPROVE')} loading={submitting === 'APPROVE'} disabled={!!submitting} />
        <Button label="প্রত্যাখ্যান করুন" variant="danger" onPress={() => act('REJECT')} loading={submitting === 'REJECT'} disabled={!!submitting} />
      </View>
    </ScrollView>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.parchment },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.heading },
  fieldLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.secondary },
  body: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body, lineHeight: 20 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
    fontFamily: fonts.sansRegular,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: colors.white,
  },
  actions: { gap: spacing.sm },
  emptyText: { fontFamily: fonts.sansRegular, color: colors.secondary },
})
