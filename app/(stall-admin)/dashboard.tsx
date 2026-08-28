import React from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatTile } from '@/components/StatTile'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { LoadingView, ErrorState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { useAuth } from '@/lib/auth-context'
import { colors, fonts, spacing } from '@/lib/theme'

interface DashboardData {
  publisher: { nameBn: string; logoUrl: string | null }
  today: { views: number; orders: number; revenue: number; currency: string }
  totalBooks: number
  totalReviews: number
  followerCount: number
  recentOrders: Array<{ id: string; displayId: string; bookTitleBn: string; amount: number; currency: string; status: string }>
  topBooks: Array<{ bookId: string; titleBn: string; views: number; orders: number; revenue: number }>
}

const ORDER_STATUS_BN: Record<string, string> = {
  PENDING: 'অপেক্ষমাণ',
  PAID: 'পরিশোধিত',
  SHIPPED: 'পাঠানো হয়েছে',
  DELIVERED: 'পৌঁছেছে',
  CANCELLED: 'বাতিল',
}

function money(amount: number, currency: string) {
  return `${currency === 'INR' ? '৳' : currency} ${Math.round(amount).toLocaleString('bn-BD')}`
}

export default function StallDashboard() {
  const { persona } = useAuth()
  const orgId = persona?.kind === 'stall' ? persona.orgId : null

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<{ data: DashboardData }>('/api/publisher/dashboard'),
    [orgId]
  )

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <ScreenHeader title={data?.data.publisher.nameBn ?? 'স্টল ড্যাশবোর্ড'} subtitle="আজকের কার্যক্রম" />
      {loading ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
        >
          <Text style={styles.sectionTitle}>আজ</Text>
          <View style={styles.grid}>
            <StatTile label="ভিউ" value={String(data?.data.today.views ?? 0)} />
            <StatTile label="অর্ডার" value={String(data?.data.today.orders ?? 0)} />
            <StatTile label="আয়" value={money(data?.data.today.revenue ?? 0, data?.data.today.currency ?? 'INR')} />
          </View>

          <Text style={styles.sectionTitle}>স্টল</Text>
          <View style={styles.grid}>
            <StatTile label="মোট বই/কাজ" value={String(data?.data.totalBooks ?? 0)} />
            <StatTile label="রিভিউ" value={String(data?.data.totalReviews ?? 0)} />
            <StatTile label="ফলোয়ার" value={String(data?.data.followerCount ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>শীর্ষ কাজ (৭ দিন)</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.topBooks ?? []).map((b, idx, arr) => (
              <View key={b.bookId} style={[styles.itemRow, idx < arr.length - 1 && styles.itemBorder]}>
                <Text style={styles.itemTitle} numberOfLines={1}>{b.titleBn}</Text>
                <Text style={styles.itemMeta}>{b.orders} অর্ডার · {b.views} ভিউ</Text>
              </View>
            ))}
            {(data?.data.topBooks ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো তথ্য নেই</Text> : null}
          </Card>

          <Text style={styles.sectionTitle}>সাম্প্রতিক অর্ডার</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.recentOrders ?? []).map((o, idx, arr) => (
              <View key={o.id} style={[styles.itemRow, idx < arr.length - 1 && styles.itemBorder, styles.orderRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{o.bookTitleBn}</Text>
                  <Text style={styles.itemMeta}>{o.displayId} · {money(o.amount, o.currency)}</Text>
                </View>
                <Badge label={ORDER_STATUS_BN[o.status] ?? o.status} tone={o.status === 'PENDING' ? 'warning' : 'success'} />
              </View>
            ))}
            {(data?.data.recentOrders ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো অর্ডার নেই</Text> : null}
          </Card>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, marginTop: spacing.sm, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  itemRow: { padding: spacing.md },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  itemMeta: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary, marginTop: 2 },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, padding: spacing.md },
})
