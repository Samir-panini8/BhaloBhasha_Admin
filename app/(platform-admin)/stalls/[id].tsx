import React, { useState } from 'react'
import { ScrollView, View, Text, Switch, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { ListRow } from '@/components/ListRow'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'

interface OrgMember {
  userId: string
  role: string
  user: { nameBn: string; nameEn: string | null; avatarUrl: string | null }
}

interface OrgDetail {
  id: string
  nameBn: string
  name: string
  type: string
  country: string
  isVerified: boolean
  isActive: boolean
  email: string | null
  phone: string | null
  website: string | null
  members: OrgMember[]
  _count: { editions: number; listings: number }
}

const ORG_TYPE_BN: Record<string, string> = {
  PUBLISHER: 'প্রকাশনা',
  SELLER: 'বিক্রেতা',
  PUBLISHER_AND_SELLER: 'প্রকাশনা ও বিক্রয়',
  ARTIST: 'রঙ্গ (শিল্পী)',
  ARTISAN: 'সোনাঝুরি (কারিগর)',
}

export default function StallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [toggling, setToggling] = useState(false)

  const { data, loading, error, refresh } = useApiQuery(
    () => api.get<{ data: OrgDetail }>(`/api/admin/organizations/${id}`),
    [id]
  )

  async function toggleVerified(next: boolean) {
    setToggling(true)
    try {
      await api.post(`/api/admin/organizations/${id}/verify`, { isVerified: next })
      await refresh()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <LoadingView />
  if (error || !data) return <ErrorState message={error ?? 'পাওয়া যায়নি'} onRetry={refresh} />

  const org = data.data

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{org.nameBn}</Text>
      <View style={styles.badgeRow}>
        <Badge label={ORG_TYPE_BN[org.type] ?? org.type} tone="navy" />
        <Badge label={org.country} tone="neutral" />
        <Badge label={org.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} tone={org.isActive ? 'success' : 'error'} />
      </View>

      <Card style={styles.row}>
        <Text style={styles.rowLabel}>যাচাইকৃত ব্যাজ</Text>
        <Switch value={org.isVerified} onValueChange={toggleVerified} disabled={toggling} trackColor={{ true: colors.navy }} />
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <Text style={styles.rowLabel}>যোগাযোগ</Text>
        <Text style={styles.value}>{org.email ?? '—'}</Text>
        <Text style={styles.value}>{org.phone ?? '—'}</Text>
        <Text style={styles.value}>{org.website ?? '—'}</Text>
      </Card>

      <Card style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org._count.editions}</Text>
          <Text style={styles.statLabel}>কাজ</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org._count.listings}</Text>
          <Text style={styles.statLabel}>লিস্টিং</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org.members.length}</Text>
          <Text style={styles.statLabel}>সদস্য</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>দলবল</Text>
      <Card style={{ padding: 0 }}>
        {org.members.map((m, idx) => (
          <ListRow
            key={m.userId}
            title={m.user.nameBn}
            subtitle={m.role}
            right={undefined}
          />
        ))}
        {org.members.length === 0 ? <Text style={styles.emptyText}>কোনো সদস্য নেই</Text> : null}
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.heading },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  value: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.heading },
  statLabel: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, textTransform: 'uppercase' },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, padding: spacing.md },
})
