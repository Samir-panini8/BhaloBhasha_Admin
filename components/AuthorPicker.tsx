import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TextField, ChoiceField } from './Field'
import { Badge } from './Badge'
import { api } from '@/lib/api'
import type { AuthorRole, AuthorSuggestion } from '@/lib/types'
import { colors, fonts, radius, spacing } from '@/lib/theme'

export interface AuthorEntry {
  key: string
  authorId: string | null
  nameBn: string
  nameEn: string
  role: AuthorRole
  /** True for a name typed in full — the server proposes it for approval. */
  isNew: boolean
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export const AUTHOR_ROLES: Array<{ value: AuthorRole; label: string }> = [
  { value: 'AUTHOR', label: 'লেখক' },
  { value: 'TRANSLATOR', label: 'অনুবাদক' },
  { value: 'EDITOR', label: 'সম্পাদক' },
  { value: 'ILLUSTRATOR', label: 'চিত্রশিল্পী' },
]

export function newAuthorEntry(): AuthorEntry {
  return { key: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, authorId: null, nameBn: '', nameEn: '', role: 'AUTHOR', isNew: false }
}

/**
 * One author slot: search the approved author list, or type a name in full to
 * propose a new author (the backend queues it and returns it in
 * `proposedAuthors`). Mirrors AuthorSlot in the web BookForm.
 */
function AuthorSlot({
  entry,
  onChange,
  onRemove,
  canRemove,
}: {
  entry: AuthorEntry
  onChange: (next: AuthorEntry) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AuthorSuggestion[] | null>(null)
  const [searching, setSearching] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (entry.authorId || entry.isNew || term.length < 2) {
      setResults(null)
      // The spinner used to be left running forever if the user deleted
      // their query while a request was in flight.
      seq.current++
      setSearching(false)
      return
    }
    const gen = ++seq.current
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ data: { authors: AuthorSuggestion[] } }>(
          `/api/authors/search?q=${encodeURIComponent(term)}&limit=8`
        )
        if (gen !== seq.current) return
        setResults(Array.isArray(res.data?.authors) ? res.data.authors : [])
      } catch {
        if (gen === seq.current) setResults([])
      } finally {
        if (gen === seq.current) setSearching(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, entry.authorId, entry.isNew])

  const chosen = entry.authorId || entry.isNew

  return (
    <View style={styles.slot}>
      {chosen ? (
        <View style={styles.chosenRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.chosenName}>{entry.nameBn || entry.nameEn}</Text>
            {entry.nameEn && entry.nameBn ? <Text style={styles.chosenSub}>{entry.nameEn}</Text> : null}
          </View>
          {entry.isNew ? <Badge label="নতুন — অনুমোদনের অপেক্ষায়" tone="warning" /> : null}
          {entry.status === 'PENDING' && !entry.isNew ? <Badge label="অনুমোদনের অপেক্ষায়" tone="warning" /> : null}
          <Pressable
            onPress={() => {
              setQuery('')
              onChange({ ...entry, authorId: null, nameBn: '', nameEn: '', isNew: false, status: undefined })
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color={colors.secondary} />
          </Pressable>
        </View>
      ) : (
        <>
          <TextField
            label="লেখকের নাম খুঁজুন"
            placeholder="অন্তত দুটি অক্ষর লিখুন"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {searching ? <ActivityIndicator color={colors.navy} style={{ alignSelf: 'flex-start' }} /> : null}
          {results?.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => onChange({ ...entry, authorId: r.id, nameBn: r.nameBn, nameEn: r.nameEn, isNew: false, status: r.status })}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
            >
              <Text style={styles.resultName}>{r.nameBn}</Text>
              <Text style={styles.resultSub}>
                {r.nameEn}
                {r.status === 'PENDING' ? ' · অনুমোদনের অপেক্ষায়' : ''}
              </Text>
            </Pressable>
          ))}
          {results && results.length === 0 && query.trim().length >= 2 ? (
            <Pressable
              onPress={() => onChange({ ...entry, authorId: null, nameBn: query.trim(), nameEn: '', isNew: true })}
              style={({ pressed }) => [styles.result, pressed && styles.pressed]}
            >
              <Text style={styles.resultName}>“{query.trim()}” — নতুন লেখক হিসেবে যোগ করুন</Text>
              <Text style={styles.resultSub}>অনুমোদনের পর সব প্রকাশকের তালিকায় যুক্ত হবেন</Text>
            </Pressable>
          ) : null}
        </>
      )}

      <ChoiceField label="ভূমিকা" value={entry.role} options={AUTHOR_ROLES} onChange={(role) => onChange({ ...entry, role })} />

      {entry.isNew ? (
        <TextField
          label="ইংরেজি নাম (ঐচ্ছিক)"
          placeholder="English name"
          value={entry.nameEn}
          onChangeText={(nameEn) => onChange({ ...entry, nameEn })}
          autoCapitalize="words"
        />
      ) : null}

      {canRemove ? (
        <Pressable onPress={onRemove} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
          <Text style={styles.removeLabel}>এই লেখককে সরান</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function AuthorPicker({
  authors,
  onChange,
  error,
}: {
  authors: AuthorEntry[]
  onChange: (next: AuthorEntry[]) => void
  error?: string
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {authors.map((entry, index) => (
        <AuthorSlot
          key={entry.key}
          entry={entry}
          canRemove={authors.length > 1}
          onChange={(next) => onChange(authors.map((a, i) => (i === index ? next : a)))}
          onRemove={() => onChange(authors.filter((_, i) => i !== index))}
        />
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => onChange([...authors, newAuthorEntry()])} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        <Text style={styles.addLabel}>+ আরেকজন লেখক যোগ করুন</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  slot: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.parchment,
  },
  chosenRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chosenName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.heading },
  chosenSub: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  result: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  resultName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.heading },
  resultSub: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
  addLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.navy },
  removeLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.error },
  error: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.error },
})
