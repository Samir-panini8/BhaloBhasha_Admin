import React, { useState } from 'react'
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

interface ModerationDetail {
  id: string
  contentType: string
  title: string | null
  body: string
  author: { nameBn: string; totalContributions: number }
  rating: number | null
  status: string
}

type Action = 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'

export default function ModerationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<Action | null>(null)

  const { data, loading, error, refresh } = useApiQuery(
    () => api.get<{ data: ModerationDetail }>(`/api/admin/moderation/${id}`),
    [id]
  )

  async function act(action: Action) {
    if (action !== 'APPROVE' && note.trim().length === 0) {
      Alert.alert('মন্তব্য প্রয়োজন', 'পরিবর্তন চাইলে বা প্রত্যাখ্যান করলে একটি কারণ লিখুন')
      return
    }
    setSubmitting(action)
    try {
      await api.post(`/api/admin/moderation/${id}`, { action, note: note.trim() || undefined })
      router.back()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) return <LoadingView />
  if (error || !data) return <ErrorState message={error ?? 'পাওয়া যায়নি'} onRetry={refresh} />

  const item = data.data

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Badge label={item.contentType} tone="navy" />
      <Text style={styles.title}>{item.title ?? 'শিরোনামহীন'}</Text>
      <Text style={styles.byline}>{item.author.nameBn} · {item.author.totalContributions} টি অবদান</Text>
      {item.rating != null ? <Text style={styles.rating}>★ {item.rating}/৫</Text> : null}

      <Card>
        <Text style={styles.body}>{item.body || '(কোনো টেক্সট নেই)'}</Text>
      </Card>

      <Text style={styles.label}>মন্তব্য (পরিবর্তন/প্রত্যাখ্যানের জন্য আবশ্যক)</Text>
      <TextInput
        style={styles.textArea}
        placeholder="লেখকের জন্য মন্তব্য..."
        placeholderTextColor={colors.secondary}
        multiline
        numberOfLines={4}
        value={note}
        onChangeText={setNote}
      />

      <View style={styles.actions}>
        <Button label="অনুমোদন করুন" onPress={() => act('APPROVE')} loading={submitting === 'APPROVE'} disabled={!!submitting} />
        <Button label="পরিবর্তন চাই" variant="secondary" onPress={() => act('REQUEST_CHANGES')} loading={submitting === 'REQUEST_CHANGES'} disabled={!!submitting} />
        <Button label="প্রত্যাখ্যান করুন" variant="danger" onPress={() => act('REJECT')} loading={submitting === 'REJECT'} disabled={!!submitting} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.heading },
  byline: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  rating: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.warning },
  body: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body, lineHeight: 22 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary, marginTop: spacing.sm },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: fonts.sansRegular,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: colors.white,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
})
