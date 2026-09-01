import React, { useState } from 'react'
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { findInPagedList } from '@/lib/find-in-list'
import { fetchPublisherAppsPage, type PublisherApp } from '@/lib/admin-lists'
import { formatDateBn, ORG_TYPE_BN } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

const STATUS_BN: Record<PublisherApp['status'], string> = {
  pending: 'মুলতুবি',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
}

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<'APPROVE' | 'REJECT' | null>(null)

  // No get-by-id on this endpoint either — look the application up in the
  // list so the screen never acts on a stale serialised copy.
  const { data: app, loading, error, refresh } = useApiQuery(
    () => findInPagedList<PublisherApp>(id, (page) => fetchPublisherAppsPage(page, 'all', 50)),
    [id]
  )

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

  if (loading) return <LoadingView />
  if (error) return <ErrorState message={error} onRetry={refresh} />
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
      <View style={styles.badgeRow}>
        <Badge label={ORG_TYPE_BN[app.type] ?? app.type} tone="navy" />
        <Badge
          label={STATUS_BN[app.status]}
          tone={app.status === 'pending' ? 'warning' : app.status === 'approved' ? 'success' : 'error'}
        />
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Field label="ইংরেজি নাম" value={app.nameEn} />
        <Field label="দেশ" value={app.country} />
        <Field label="ফোন" value={app.phone} />
        <Field label="ইমেইল" value={app.email ?? '—'} />
        <Field label="ওয়েবসাইট" value={app.website ?? '—'} />
        <Field label="নিবন্ধন নম্বর" value={app.registrationNumber ?? '—'} />
        <Field label="আবেদনের তারিখ" value={formatDateBn(app.createdAt)} />
      </Card>

      {app.representativeBooks ? (
        <Card>
          <Text style={styles.fieldLabel}>প্রতিনিধিত্বমূলক বই</Text>
          <Text style={styles.body}>{app.representativeBooks}</Text>
        </Card>
      ) : null}

      {app.description ? (
        <Card>
          <Text style={styles.fieldLabel}>বিবরণ</Text>
          <Text style={styles.body}>{app.description}</Text>
        </Card>
      ) : null}

      {app.reviewNote ? (
        <Card>
          <Text style={styles.fieldLabel}>পর্যালোচনার মন্তব্য</Text>
          <Text style={styles.body}>{app.reviewNote}</Text>
        </Card>
      ) : null}

      {app.status === 'pending' ? (
        <>
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
            <Button
              label="প্রত্যাখ্যান করুন"
              variant="danger"
              onPress={() => act('REJECT')}
              loading={submitting === 'REJECT'}
              disabled={!!submitting}
            />
          </View>
        </>
      ) : (
        <Text style={styles.meta}>
          এই আবেদনটি ইতিমধ্যে {STATUS_BN[app.status]} হয়েছে
          {app.organization ? ` — স্টল: ${app.organization.nameBn}` : ''}।
        </Text>
      )}
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
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  fieldLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.secondary },
  body: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body, lineHeight: 20 },
  meta: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
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
