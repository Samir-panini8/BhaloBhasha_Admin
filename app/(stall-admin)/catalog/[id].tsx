import React, { useState } from 'react'
import { ScrollView, View, Text, TextInput, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { useAuth } from '@/lib/auth-context'
import { canWriteCatalog } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

interface Price {
  region: 'IN' | 'BD'
  price: number
  currency: string
  stock: number
  trackInventory: boolean
}

interface BookDetail {
  id: string
  titleBn: string
  titleEn: string
  authors: Array<{ nameBn: string; role: string }>
  genres: Array<{ nameBn: string }>
  prices: Price[]
}

export default function CatalogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { orgMemberships, persona } = useAuth()
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<'IN' | 'BD' | null>(null)

  const { data, loading, error, refresh } = useApiQuery(
    () => api.get<{ data: BookDetail }>(`/api/publisher/books/${id}`),
    [id]
  )

  const myOrgRole = persona?.kind === 'stall' ? orgMemberships.find((m) => m.organization.id === persona.orgId)?.role : undefined
  const canEdit = myOrgRole ? canWriteCatalog(myOrgRole) : false

  async function saveStock(price: Price) {
    const draft = stockDraft[price.region]
    const nextStock = draft != null ? parseInt(draft, 10) : price.stock
    if (Number.isNaN(nextStock) || nextStock < 0) {
      Alert.alert('অবৈধ পরিমাণ', 'স্টক একটি সঠিক সংখ্যা হতে হবে')
      return
    }
    setSaving(price.region)
    try {
      await api.put(`/api/publisher/books/${id}`, {
        trackInventory: true,
        ...(price.region === 'IN' ? { priceIN: price.price, stockIN: nextStock } : { priceBD: price.price, stockBD: nextStock }),
      })
      await refresh()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <LoadingView />
  if (error || !data) return <ErrorState message={error ?? 'পাওয়া যায়নি'} onRetry={refresh} />

  const book = data.data

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{book.titleBn}</Text>
      <Text style={styles.subtitle}>{book.titleEn}</Text>

      <View style={styles.badgeRow}>
        {book.genres.map((g) => (
          <Badge key={g.nameBn} label={g.nameBn} tone="neutral" />
        ))}
      </View>

      {book.authors.length > 0 ? (
        <Text style={styles.meta}>{book.authors.map((a) => a.nameBn).join(', ')}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>মূল্য ও স্টক</Text>
      {book.prices.length === 0 ? (
        <Card>
          <Text style={styles.meta}>কোনো মূল্য নির্ধারণ করা হয়নি</Text>
        </Card>
      ) : (
        book.prices.map((p) => (
          <Card key={p.region} style={{ gap: spacing.sm }}>
            <View style={styles.priceHeader}>
              <Text style={styles.regionLabel}>{p.region === 'IN' ? 'ভারত (₹)' : 'বাংলাদেশ (৳)'}</Text>
              <Text style={styles.priceValue}>{p.price}</Text>
            </View>
            {p.trackInventory ? (
              <View style={styles.stockRow}>
                <TextInput
                  style={styles.stockInput}
                  keyboardType="number-pad"
                  value={stockDraft[p.region] ?? String(p.stock)}
                  onChangeText={(v) => setStockDraft((s) => ({ ...s, [p.region]: v }))}
                  editable={canEdit}
                />
                <Button
                  label="স্টক আপডেট করুন"
                  variant="secondary"
                  onPress={() => saveStock(p)}
                  loading={saving === p.region}
                  disabled={!canEdit}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <Text style={styles.meta}>স্টক ট্র্যাক করা হয় না (অসীম)</Text>
            )}
          </Card>
        ))
      )}
      {!canEdit ? <Text style={styles.meta}>আপনার সিটে এটি সম্পাদনার অনুমতি নেই</Text> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.heading },
  subtitle: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, textTransform: 'uppercase', marginTop: spacing.sm },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  regionLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  priceValue: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.heading },
  stockRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  stockInput: {
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontFamily: fonts.sansRegular,
    fontSize: 14,
    color: colors.heading,
    backgroundColor: colors.white,
    textAlign: 'center',
  },
})
