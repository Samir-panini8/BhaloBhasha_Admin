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
import { formatDateBn } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'
import { CONTENT_TYPE_BN, fetchReportsPage, type ReportItem } from './index'

type Action = 'DISMISS' | 'REMOVE_CONTENT' | 'WARN_USER' | 'SUSPEND_USER'

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<Action | null>(null)

  // /api/admin/reports has no get-by-id, so the row is looked up in the
  // list (which embeds the reported content) — never read from the url.
  const { data, loading, error, refresh } = useApiQuery(
    () => findInPagedList<ReportItem>(id, (page) => fetchReportsPage(page, undefined, 50)),
    [id]
  )
  const item = data

  async function act(action: Action) {
    setSubmitting(action)
    try {
      await api.put(`/api/admin/reports/${id}`, { action, note: note.trim() || undefined })
      router.back()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) return <LoadingView />
  if (error) return <ErrorState message={error} onRetry={refresh} />
  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>রিপোর্টের বিবরণ পাওয়া যায়নি</Text>
      </View>
    )
  }

  const content = item.reportedContent as Record<string, unknown> | null

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.reason}>কারণ: {item.reason || 'উল্লেখ নেই'}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Badge label={CONTENT_TYPE_BN[item.contentType] ?? item.contentType} tone="navy" />
        <Badge label={item.status === 'OPEN' ? 'খোলা' : 'পর্যালোচিত'} tone={item.status === 'OPEN' ? 'warning' : 'neutral'} />
      </View>
      <Text style={styles.meta}>
        রিপোর্টার: {item.reporter?.nameBn ?? 'অজানা'} · {formatDateBn(item.createdAt)}
      </Text>
      {item.description ? <Text style={styles.body}>{item.description}</Text> : null}

      {content ? (
        <Card>
          <Text style={styles.contentTitle}>রিপোর্ট করা কন্টেন্ট</Text>
          {typeof content.titleBn === 'string' ? <Text style={styles.body}>{content.titleBn}</Text> : null}
          {typeof content.body === 'string' ? <Text style={styles.body}>{String(content.body).slice(0, 400)}</Text> : null}
          {typeof content.nameBn === 'string' ? <Text style={styles.body}>{content.nameBn}</Text> : null}
        </Card>
      ) : (
        <Card>
          <Text style={styles.body}>মূল কন্টেন্টটি আর পাওয়া যাচ্ছে না (হয়তো ইতিমধ্যে মুছে ফেলা হয়েছে)।</Text>
        </Card>
      )}

      {item.status === 'OPEN' ? (
        <>
          <TextInput
            style={styles.textArea}
            placeholder="ব্যবহারকারীর জন্য মন্তব্য (ঐচ্ছিক)"
            placeholderTextColor={colors.secondary}
            multiline
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.actions}>
            <Button label="উপেক্ষা করুন" variant="secondary" onPress={() => act('DISMISS')} loading={submitting === 'DISMISS'} disabled={!!submitting} />
            <Button label="কন্টেন্ট সরান" variant="danger" onPress={() => act('REMOVE_CONTENT')} loading={submitting === 'REMOVE_CONTENT'} disabled={!!submitting} />
            <Button label="ব্যবহারকারীকে সতর্ক করুন" variant="secondary" onPress={() => act('WARN_USER')} loading={submitting === 'WARN_USER'} disabled={!!submitting} />
            <Button
              label="ব্যবহারকারী স্থগিত করুন"
              variant="danger"
              onPress={() =>
                Alert.alert('নিশ্চিত করুন', 'এই ব্যবহারকারীকে সত্যিই স্থগিত করতে চান?', [
                  { text: 'বাতিল', style: 'cancel' },
                  { text: 'স্থগিত করুন', style: 'destructive', onPress: () => act('SUSPEND_USER') },
                ])
              }
              loading={submitting === 'SUSPEND_USER'}
              disabled={!!submitting}
            />
          </View>
        </>
      ) : (
        <Text style={styles.meta}>
          এই রিপোর্টটি ইতিমধ্যে পর্যালোচিত হয়েছে{item.reviewer?.nameBn ? ` — ${item.reviewer.nameBn}` : ''}।
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.parchment },
  reason: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.heading },
  meta: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  contentTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary, marginBottom: spacing.xs },
  body: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body, lineHeight: 21 },
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
