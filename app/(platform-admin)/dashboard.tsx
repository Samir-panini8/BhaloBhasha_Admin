import React from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StatTile } from '@/components/StatTile'
import { Card } from '@/components/Card'
import { LoadingView, ErrorState } from '@/components/States'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { currencySymbol, formatDateBn } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

interface DashboardData {
  people: { total: number; newToday: number; newThisWeek: number; activeReaders7d: number }
  marketplace: { organizations: number; works: number; editions: number; activeListings: number; artisans: number }
  editorial: { pendingModeration: number; pendingApplications: number; openReports: number }
  commerce: {
    ordersToday: number
    paidOrdersToday: number
    revenueToday: Array<{ currency: string; amount: number }>
    ordersAwaitingPayment: number
  }
  recentActivity: Array<{ id: string; label: string; createdAt: string }>
}

function formatMoney(entries: Array<{ currency: string; amount: number }>) {
  if (entries.length === 0) return '০'
  // ₹ for INR, ৳ for BDT — these were swapped, so rupees showed as taka.
  return entries.map((e) => `${currencySymbol(e.currency)}${Math.round(e.amount).toLocaleString('bn-BD')}`).join(' + ')
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data, loading, refreshing, error, refresh } = useApiQuery(() => api.get<{ data: DashboardData }>('/api/admin/dashboard'))

  return (
    <View style={{ flex: 1, backgroundColor: colors.parchment }}>
      <ScreenHeader title="প্ল্যাটফর্ম ড্যাশবোর্ড" subtitle="ভালো ভাষা — সব পরিসংখ্যান এক নজরে" />
      {loading ? (
        <LoadingView />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
        >
          <Text style={styles.sectionTitle}>আজকের কমার্স</Text>
          <View style={styles.grid}>
            <StatTile
              label="আজকের অর্ডার"
              value={String(data?.data.commerce.ordersToday ?? 0)}
              hint={`${data?.data.commerce.paidOrdersToday ?? 0} পরিশোধিত`}
              onPress={() => router.push('/(platform-admin)/orders')}
            />
            <StatTile label="আজকের আয়" value={formatMoney(data?.data.commerce.revenueToday ?? [])} />
            <StatTile
              label="অপেক্ষমাণ পেমেন্ট"
              value={String(data?.data.commerce.ordersAwaitingPayment ?? 0)}
              tone="warning"
              onPress={() => router.push('/(platform-admin)/orders')}
            />
            <StatTile label="সক্রিয় ব্যবহারকারী (৭ দিন)" value={String(data?.data.people.activeReaders7d ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>নজর দরকার</Text>
          <View style={styles.grid}>
            <StatTile
              label="মডারেশন সারি"
              value={String(data?.data.editorial.pendingModeration ?? 0)}
              tone={data && data.data.editorial.pendingModeration > 0 ? 'warning' : 'default'}
              onPress={() => router.push('/(platform-admin)/moderation')}
            />
            <StatTile
              label="স্টল আবেদন"
              value={String(data?.data.editorial.pendingApplications ?? 0)}
              tone={data && data.data.editorial.pendingApplications > 0 ? 'warning' : 'default'}
              onPress={() => router.push('/(platform-admin)/stalls')}
            />
            <StatTile
              label="খোলা রিপোর্ট"
              value={String(data?.data.editorial.openReports ?? 0)}
              tone={data && data.data.editorial.openReports > 0 ? 'error' : 'default'}
              onPress={() => router.push('/(platform-admin)/reports')}
            />
          </View>

          <Text style={styles.sectionTitle}>প্ল্যাটফর্ম</Text>
          <View style={styles.grid}>
            <StatTile
              label="মোট ব্যবহারকারী"
              value={String(data?.data.people.total ?? 0)}
              hint={`+${data?.data.people.newToday ?? 0} আজ`}
              onPress={() => router.push('/(platform-admin)/more/users')}
            />
            <StatTile
              label="স্টল"
              value={String(data?.data.marketplace.organizations ?? 0)}
              onPress={() => router.push('/(platform-admin)/stalls')}
            />
            <StatTile label="সক্রিয় লিস্টিং" value={String(data?.data.marketplace.activeListings ?? 0)} />
            <StatTile label="কারিগর স্টল" value={String(data?.data.marketplace.artisans ?? 0)} />
          </View>

          <Text style={styles.sectionTitle}>সাম্প্রতিক কার্যক্রম</Text>
          <Card style={{ padding: 0 }}>
            {(data?.data.recentActivity ?? []).slice(0, 8).map((item, idx, arr) => (
              <View key={item.id} style={[styles.activityRow, idx < arr.length - 1 && styles.activityBorder]}>
                <Text style={styles.activityLabel}>{item.label}</Text>
                <Text style={styles.activityMeta}>{formatDateBn(item.createdAt)}</Text>
              </View>
            ))}
            {(data?.data.recentActivity ?? []).length === 0 ? <Text style={styles.emptyText}>কোনো সাম্প্রতিক কার্যক্রম নেই</Text> : null}
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
  activityRow: { padding: spacing.md },
  activityBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  activityLabel: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body },
  activityMeta: { fontFamily: fonts.sansRegular, fontSize: 11, color: colors.secondary, marginTop: 2 },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, padding: spacing.md },
})
