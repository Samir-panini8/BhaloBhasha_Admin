import React, { useState } from 'react'
import { ScrollView, View, Text, Switch, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { colors, fonts, spacing } from '@/lib/theme'
import type { Role } from '@/lib/types'

interface UserDetail {
  id: string
  nameBn: string
  phone: string | null
  country: string
  deletedAt: string | null
  roles: Array<{ role: Role }>
}

interface Stats {
  orders: { count: number; total: number }
  followers: number
  following: number
  totalPoints: number
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [busy, setBusy] = useState<string | null>(null)

  const { data, loading, error, refresh } = useApiQuery(
    () => api.get<{ data: { user: UserDetail; stats: Stats } }>(`/api/admin/users/${id}`),
    [id]
  )

  async function toggleRole(role: Role, grant: boolean) {
    setBusy(role)
    try {
      await api.put(`/api/admin/users/${id}`, { action: grant ? 'GRANT_ROLE' : 'REVOKE_ROLE', role })
      await refresh()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setBusy(null)
    }
  }

  async function toggleSuspend(suspend: boolean) {
    setBusy('SUSPEND')
    try {
      await api.put(`/api/admin/users/${id}`, { action: suspend ? 'SUSPEND' : 'UNSUSPEND' })
      await refresh()
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <LoadingView />
  if (error || !data) return <ErrorState message={error ?? 'পাওয়া যায়নি'} onRetry={refresh} />

  const { user, stats } = data.data
  const roles = user.roles.map((r) => r.role)

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{user.nameBn || 'নামহীন'}</Text>
      <Text style={styles.meta}>{user.phone ?? '—'} · {user.country}</Text>
      {user.deletedAt ? <Badge label="স্থগিত" tone="error" /> : <Badge label="সক্রিয়" tone="success" />}

      <Card style={styles.statRow}>
        <Stat label="অর্ডার" value={String(stats.orders.count)} />
        <Stat label="পয়েন্ট" value={String(stats.totalPoints)} />
        <Stat label="ফলোয়ার" value={String(stats.followers)} />
      </Card>

      <Text style={styles.sectionTitle}>রোল</Text>
      <Card style={{ gap: spacing.md }}>
        <RoleRow label="ADMIN" active={roles.includes('ADMIN')} busy={busy === 'ADMIN'} onToggle={(v) => toggleRole('ADMIN', v)} />
        <RoleRow label="PUBLISHER" active={roles.includes('PUBLISHER')} busy={busy === 'PUBLISHER'} onToggle={(v) => toggleRole('PUBLISHER', v)} />
        <RoleRow label="READER" active={true} disabled />
      </Card>

      <Button
        label={user.deletedAt ? 'স্থগিতাদেশ তুলুন' : 'অ্যাকাউন্ট স্থগিত করুন'}
        variant={user.deletedAt ? 'secondary' : 'danger'}
        loading={busy === 'SUSPEND'}
        onPress={() =>
          Alert.alert('নিশ্চিত করুন', user.deletedAt ? 'স্থগিতাদেশ তুলে নিতে চান?' : 'এই অ্যাকাউন্ট স্থগিত করতে চান?', [
            { text: 'বাতিল', style: 'cancel' },
            { text: 'নিশ্চিত করুন', style: 'destructive', onPress: () => toggleSuspend(!user.deletedAt) },
          ])
        }
      />
    </ScrollView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function RoleRow({ label, active, busy, disabled, onToggle }: { label: string; active: boolean; busy?: boolean; disabled?: boolean; onToggle?: (v: boolean) => void }) {
  return (
    <View style={styles.roleRow}>
      <Text style={styles.roleLabel}>{label}</Text>
      <Switch value={active} onValueChange={onToggle} disabled={disabled || busy} trackColor={{ true: colors.navy }} />
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.heading },
  meta: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statValue: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.heading },
  statLabel: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, textTransform: 'uppercase' },
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
})
