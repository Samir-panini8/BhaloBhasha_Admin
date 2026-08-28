import React, { useState } from 'react'
import { ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatTile } from '@/components/StatTile'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { LoadingView, ErrorState, EmptyState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

type Period = 'current_month' | 'last_month' | 'last_3_months' | 'last_year'

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'current_month', label: 'এই মাস' },
  { key: 'last_month', label: 'গত মাস' },
  { key: 'last_3_months', label: '৩ মাস' },
  { key: 'last_year', label: '১ বছর' },
]

interface RevenueData {
  summary: { grossRevenue: number; commission: number; netRevenue: number; totalOrders: number; currency: string }
  recentTransactions: Array<{ orderId: string; bookTitleBn: string; netAmount: number; currency: string; orderStatus: string }>
  payouts: Array<{ id: string; netPayout: number; currency: string; status: string; periodEnd: string }>
}

function money(amount: number, currency: string) {
  return `${currency === 'INR' ? '৳' : currency} ${Math.round(amount).toLocaleString('bn-BD')}`
}

export default function RevenueScreen() {
  const [period, setPeriod] = useState<Period>('current_month')

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<{ data: RevenueData }>(`/api/publisher/revenue?period=${period}`),
    [period]
  )

  const notAvailable = error && error.includes('পাওয়া যায়নি')

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <ScreenHeader title="আয়ের প্রতিবেদন" />
      <View style={styles.filterRow}>
        {PERIODS.map((p) => (
          <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, period === p.key && styles.chipActive]}>
            <Text style={[styles.chipLabel, period === p.key && styles.chipLabelActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingView />
      ) : notAvailable ? (
        <EmptyState icon="cash-outline" title="আয়ের প্রতিবেদন উপলব্ধ নয়" subtitle="এই স্টলের জন্য এখনো রাজস্ব ট্র্যাকিং সেট আপ করা হয়নি" />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
        >
          <View style={styles.grid}>
            <StatTile label="মোট আয়" value={money(data?.data.summary.grossRevenue ?? 0, data?.data.summary.currency ?? 'INR')} />
            <StatTile label="নিট আয়" value={money(data?.data.summary.netRevenue ?? 0, data?.data.summary.currency ?? 'INR')} />
            <StatTile label="কমিশন" value={money(data?.data.summary.commission ?? 0, data?.data.summary.currency ?? 'INR')} />
            <StatTile label="অর্ডার" value={String(data?.data.summary.totalOrders ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>পেআউট</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.payouts ?? []).map((p, idx, arr) => (
              <View key={p.id} style={[styles.row, idx < arr.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowTitle}>{p.periodEnd}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.rowValue}>{money(p.netPayout, p.currency)}</Text>
                  <Badge label={p.status} tone={p.status === 'PAID' ? 'success' : 'neutral'} />
                </View>
              </View>
            ))}
            {(data?.data.payouts ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো পেআউট হয়নি</Text> : null}
          </Card>

          <Text style={styles.sectionTitle}>লেনদেন</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.recentTransactions ?? []).slice(0, 20).map((t, idx, arr) => (
              <View key={t.orderId + t.bookTitleBn} style={[styles.row, idx < arr.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowTitle} numberOfLines={1}>{t.bookTitleBn}</Text>
                <Text style={styles.rowValue}>{money(t.netAmount, t.currency)}</Text>
              </View>
            ))}
            {(data?.data.recentTransactions ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো লেনদেন নেই</Text> : null}
          </Card>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.navyMist },
  chipActive: { backgroundColor: colors.navy },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.navy },
  chipLabelActive: { color: colors.white },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading, flex: 1 },
  rowValue: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.heading },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, padding: spacing.md },
})
