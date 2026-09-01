import React, { useCallback } from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatTile } from '@/components/StatTile'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { LoadingView, ErrorState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { useAuth } from '@/lib/auth-context'
import { ORDER_STATUS_BN, orderStatusTone } from '@/lib/types'
import type { OrderStatus } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

interface DashboardData {
  publisher: { nameBn: string; logoUrl: string | null }
  // ⚠️ `views` is null, not 0, until VIEW events are recorded on the web —
  // the API refuses to invent a count. Nothing renders it for that reason.
  today: { views: number | null; orders: number; unitsSold: number; revenue: number; currency: string }
  thisMonth: { orders: number; unitsSold: number; revenue: number; currency: string }
  lifetime: { orders: number; unitsSold: number; revenue: number; currency: string }
  lastOrderAt: string | null
  pendingOrderResponses: number
  totalBooks: number
  totalReviews: number
  followerCount: number
  recentOrders: Array<{ id: string; displayId: string; bookTitleBn: string; amount: number; currency: string; status: OrderStatus }>
  topBooks: Array<{ bookId: string; titleBn: string; views: number | null; orders: number; unitsSold: number; revenue: number }>
}

function money(amount: number, currency: string) {
  // ₹ for INR, ৳ for BDT. This had them the wrong way round: every rupee
  // figure in the stall dashboard was labelled with the taka sign.
  const symbol = currency === 'INR' ? '₹' : currency === 'BDT' ? '৳' : currency
  return `${symbol} ${Math.round(amount).toLocaleString('bn-BD')}`
}

export default function StallDashboard() {
  const router = useRouter()
  const { persona, refreshOrganizations } = useAuth()
  const orgId = persona?.kind === 'stall' ? persona.orgId : null

  const { data, loading, refreshing, error, refresh } = useApiQuery(
    () => api.get<{ data: DashboardData }>('/api/publisher/dashboard'),
    [orgId]
  )

  // The dashboard figures come from the API on every focus, but the stall's
  // own name/logo live in the auth context — re-read them here too so a
  // change made on the website shows on the home screen.
  useFocusEffect(
    useCallback(() => {
      refreshOrganizations()
    }, [refreshOrganizations])
  )

  const pending = data?.data.pendingOrderResponses ?? 0

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
          {pending > 0 ? (
            <Pressable onPress={() => router.push('/(stall-admin)/orders')} style={styles.alertCard}>
              <Text style={styles.alertTitle}>{pending}টি অর্ডার আপনার উত্তরের অপেক্ষায়</Text>
              <Text style={styles.alertBody}>গ্রহণ বা ফেরানোর জন্য চাপ দিন →</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>আজ</Text>
          <View style={styles.grid}>
            <StatTile label="অর্ডার" value={String(data?.data.today.orders ?? 0)} />
            <StatTile label="কপি" value={String(data?.data.today.unitsSold ?? 0)} />
            <StatTile label="আয়" value={money(data?.data.today.revenue ?? 0, data?.data.today.currency ?? 'INR')} />
          </View>

          <Text style={styles.sectionTitle}>এই মাস</Text>
          <View style={styles.grid}>
            <StatTile label="অর্ডার" value={String(data?.data.thisMonth.orders ?? 0)} />
            <StatTile label="কপি" value={String(data?.data.thisMonth.unitsSold ?? 0)} />
            <StatTile
              label="আয়"
              value={money(data?.data.thisMonth.revenue ?? 0, data?.data.thisMonth.currency ?? 'INR')}
            />
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
                <Text style={styles.itemMeta}>{b.orders} অর্ডার · {b.unitsSold} কপি</Text>
              </View>
            ))}
            {(data?.data.topBooks ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো তথ্য নেই</Text> : null}
          </Card>

          <Text style={styles.sectionTitle}>সাম্প্রতিক অর্ডার</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.recentOrders ?? []).map((o, idx, arr) => (
              // ⚠️ INDEX IN THE KEY. `recentOrders` is one row per order LINE,
              // so a two-book cart from this stall repeats the same order id.
              <View key={`${o.id}-${idx}`} style={[styles.itemRow, idx < arr.length - 1 && styles.itemBorder, styles.orderRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{o.bookTitleBn}</Text>
                  <Text style={styles.itemMeta}>{o.displayId} · {money(o.amount, o.currency)}</Text>
                </View>
                {/* A cancelled order used to render green here. */}
                <Badge label={ORDER_STATUS_BN[o.status] ?? o.status} tone={orderStatusTone(o.status)} />
              </View>
            ))}
            {(data?.data.recentOrders ?? []).length === 0 ? <Text style={styles.emptyText}>এখনো কোনো অর্ডার নেই</Text> : null}
          </Card>
          <Pressable onPress={() => router.push('/(stall-admin)/orders')} style={{ paddingVertical: spacing.sm }}>
            <Text style={styles.link}>সব অর্ডার দেখুন →</Text>
          </Pressable>
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
  link: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.navy },
  alertCard: {
    backgroundColor: '#FBF0DD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.md,
    gap: 2,
  },
  alertTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.heading },
  alertBody: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.body },
})
