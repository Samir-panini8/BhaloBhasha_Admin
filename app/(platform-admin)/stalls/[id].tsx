import React, { useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Card } from '@/components/Card'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { ListRow } from '@/components/ListRow'
import { Section, TextField, ToggleRow, ChoiceField } from '@/components/Field'
import { CoverUpload } from '@/components/ImageUpload'
import { LoadingView, ErrorState } from '@/components/States'
import { api, ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { ORG_ROLE_BN, ORG_TYPE_BN } from '@/lib/types'
import type { OrgRole, OrgType } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

interface OrgMember {
  userId: string
  role: OrgRole
  user: { nameBn: string; nameEn: string | null; avatarUrl: string | null }
}

interface OrgDetail {
  id: string
  nameBn: string
  name: string
  slug: string
  type: OrgType
  country: string
  isVerified: boolean
  isActive: boolean
  description: string | null
  descriptionBn: string | null
  logoUrl: string | null
  email: string | null
  phone: string | null
  website: string | null
  members: OrgMember[]
  _count: { editions: number; listings: number }
}

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string }> = [
  { value: 'OWNER', label: 'মালিক' },
  { value: 'ADMIN', label: 'অ্যাডমিন' },
  { value: 'STAFF', label: 'কর্মী' },
  { value: 'VIEWER', label: 'দর্শক' },
]

/**
 * Platform-admin stall detail. It used to be read-only apart from the
 * verified switch: the name, contact details, active flag and the stall's
 * team could only be changed on the website.
 */
export default function StallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  const { data, loading, error, refresh } = useApiQuery(
    () => api.get<{ data: OrgDetail }>(`/api/admin/organizations/${id}`),
    [id]
  )
  const org = data?.data

  const [nameBn, setNameBn] = useState('')
  const [name, setName] = useState('')
  const [descriptionBn, setDescriptionBn] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [isActive, setIsActive] = useState(true)

  // New-member form.
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<OrgRole>('STAFF')
  // Which member's role picker is open (Android Alerts only show three
  // buttons, so the four roles are picked from an inline chip row).
  const [roleEditFor, setRoleEditFor] = useState<string | null>(null)

  useEffect(() => {
    if (!org) return
    setNameBn(org.nameBn ?? '')
    setName(org.name ?? '')
    setDescriptionBn(org.descriptionBn ?? '')
    setLogoUrl(org.logoUrl)
    setEmail(org.email ?? '')
    setPhone(org.phone ?? '')
    setWebsite(org.website ?? '')
    setIsActive(org.isActive)
  }, [org])

  async function run(action: () => Promise<unknown>, failure = 'আবার চেষ্টা করুন') {
    setBusy(true)
    try {
      await action()
      await refresh()
      return true
    } catch (err) {
      Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : failure)
      return false
    } finally {
      setBusy(false)
    }
  }

  function toggleVerified(next: boolean) {
    run(() => api.post(`/api/admin/organizations/${id}/verify`, { isVerified: next }))
  }

  async function saveDetails() {
    if (!nameBn.trim() || !name.trim()) {
      Alert.alert('নাম দিন', 'বাংলা ও ইংরেজি — দুটি নামই দরকার।')
      return
    }
    const ok = await run(() =>
      api.put(`/api/admin/organizations/${id}`, {
        nameBn: nameBn.trim(),
        name: name.trim(),
        descriptionBn: descriptionBn.trim(),
        logoUrl: logoUrl,
        email: email.trim() || null,
        phone: phone.trim() || null,
        website: website.trim() || null,
        isActive,
      })
    )
    if (ok) setEditing(false)
  }

  function addMember() {
    const target = memberEmail.trim()
    if (!target) {
      Alert.alert('ইমেইল দিন', 'সদস্যের ইমেইল লিখুন — তিনি অন্তত একবার লগ ইন করে থাকতে হবেন।')
      return
    }
    run(async () => {
      await api.post(`/api/admin/organizations/${id}/members`, { email: target, role: memberRole })
      setMemberEmail('')
    })
  }

  function removeMember(member: OrgMember) {
    Alert.alert('সদস্য সরাবেন?', `${member.user.nameBn} আর এই স্টলে কাজ করতে পারবেন না।`, [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'সরান',
        style: 'destructive',
        onPress: () =>
          run(() => api.delete(`/api/admin/organizations/${id}/members`, { userId: member.userId })),
      },
    ])
  }

  function changeRole(member: OrgMember, next: OrgRole) {
    setRoleEditFor(null)
    if (next === member.role) return
    // The members endpoint has no role-update verb, so a change is a remove
    // followed by an add. If the add fails the seat would simply be gone, so
    // the original role is put back and the failure is reported loudly.
    Alert.alert('ভূমিকা বদলাবেন?', `${member.user.nameBn} — ${ORG_ROLE_BN[member.role]} → ${ORG_ROLE_BN[next]}`, [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'বদলান',
        onPress: async () => {
          setBusy(true)
          try {
            await api.delete(`/api/admin/organizations/${id}/members`, { userId: member.userId })
            try {
              await api.post(`/api/admin/organizations/${id}/members`, { userId: member.userId, role: next })
            } catch (addErr) {
              try {
                await api.post(`/api/admin/organizations/${id}/members`, { userId: member.userId, role: member.role })
                Alert.alert(
                  'ভূমিকা বদলানো যায়নি',
                  `${addErr instanceof ApiError ? addErr.message : 'সার্ভার সাড়া দেয়নি'} — পুরোনো ভূমিকা ফিরিয়ে দেওয়া হয়েছে।`
                )
              } catch {
                Alert.alert(
                  'সদস্যপদ ফেরানো যায়নি',
                  `${member.user.nameBn} এই মুহূর্তে স্টলের সদস্য নন। নিচের ফর্ম থেকে আবার যোগ করুন।`
                )
              }
            }
          } catch (err) {
            Alert.alert('ব্যর্থ হয়েছে', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
          } finally {
            setBusy(false)
            await refresh()
          }
        },
      },
    ])
  }

  if (loading) return <LoadingView />
  if (error || !org) return <ErrorState message={error ?? 'পাওয়া যায়নি'} onRetry={refresh} />

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.parchment }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{org.nameBn}</Text>
      <View style={styles.badgeRow}>
        <Badge label={ORG_TYPE_BN[org.type] ?? org.type} tone="navy" />
        <Badge label={org.country} tone="neutral" />
        <Badge label={org.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} tone={org.isActive ? 'success' : 'error'} />
        <Badge label={org.isVerified ? 'যাচাইকৃত' : 'অযাচাই'} tone={org.isVerified ? 'success' : 'neutral'} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <ToggleRow label="যাচাইকৃত ব্যাজ" value={org.isVerified} onValueChange={toggleVerified} disabled={busy} />
      </Card>

      <Card style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org._count?.editions ?? 0}</Text>
          <Text style={styles.statLabel}>কাজ</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org._count?.listings ?? 0}</Text>
          <Text style={styles.statLabel}>লিস্টিং</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{org.members.length}</Text>
          <Text style={styles.statLabel}>সদস্য</Text>
        </View>
      </Card>

      {editing ? (
        <Section title="স্টল সম্পাদনা">
          <CoverUpload value={logoUrl} onChange={setLogoUrl} folder="general" label="লোগো" />
          <TextField label="নাম (বাংলা)" required value={nameBn} onChangeText={setNameBn} />
          <TextField label="Name (English)" required value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField label="পরিচিতি" multiline value={descriptionBn} onChangeText={setDescriptionBn} />
          <TextField label="ইমেইল" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="ফোন" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextField label="ওয়েবসাইট" placeholder="https://..." value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <ToggleRow
            label="স্টল সক্রিয়"
            hint="বন্ধ করলে স্টলটি সাইটে দেখা যাবে না এবং নতুন অর্ডার নিতে পারবে না।"
            value={isActive}
            onValueChange={setIsActive}
          />
          <Button label="সংরক্ষণ করুন" onPress={saveDetails} loading={busy} />
          <Button label="বাতিল" variant="secondary" onPress={() => setEditing(false)} />
        </Section>
      ) : (
        <>
          <Card style={{ gap: spacing.xs }}>
            <Text style={styles.rowLabel}>যোগাযোগ</Text>
            <Text style={styles.value}>{org.email ?? '—'}</Text>
            <Text style={styles.value}>{org.phone ?? '—'}</Text>
            <Text style={styles.value}>{org.website ?? '—'}</Text>
          </Card>
          <Button label="স্টলের তথ্য সম্পাদনা করুন" variant="secondary" onPress={() => setEditing(true)} />
        </>
      )}

      <Text style={styles.sectionTitle}>দলবল</Text>
      <Card style={{ padding: 0 }}>
        {org.members.map((m) => (
          <View key={m.userId}>
            <ListRow
              title={m.user.nameBn}
              subtitle={ORG_ROLE_BN[m.role] ?? m.role}
              right={
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label="ভূমিকা"
                    variant="ghost"
                    onPress={() => setRoleEditFor((prev) => (prev === m.userId ? null : m.userId))}
                  />
                  <Button label="সরান" variant="ghost" onPress={() => removeMember(m)} />
                </View>
              }
            />
            {roleEditFor === m.userId ? (
              <View style={styles.rolePicker}>
                <ChoiceField
                  label="নতুন ভূমিকা"
                  value={m.role}
                  options={ROLE_OPTIONS}
                  onChange={(next) => changeRole(m, next)}
                />
              </View>
            ) : null}
          </View>
        ))}
        {org.members.length === 0 ? <Text style={styles.emptyText}>কোনো সদস্য নেই</Text> : null}
      </Card>

      <Section title="নতুন সদস্য যোগ করুন" hint="ব্যক্তিকে আগে একবার সাইটে লগ ইন করতে হবে।">
        <TextField
          label="ইমেইল"
          placeholder="name@example.com"
          value={memberEmail}
          onChangeText={setMemberEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <ChoiceField label="ভূমিকা" value={memberRole} options={ROLE_OPTIONS} onChange={setMemberRole} />
        <Button label="যোগ করুন" onPress={addMember} loading={busy} />
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  title: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.heading },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  value: { fontFamily: fonts.sansRegular, fontSize: 14, color: colors.body },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.heading },
  statLabel: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.secondary, textTransform: 'uppercase' },
  emptyText: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary, padding: spacing.md },
  rolePicker: { padding: spacing.lg, paddingTop: 0, backgroundColor: colors.parchment },
})
