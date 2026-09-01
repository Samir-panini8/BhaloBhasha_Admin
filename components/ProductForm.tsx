import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { Button } from './Button'
import { Section, TextField, ToggleRow, Chip, ChipRow, ChoiceField, FieldError } from './Field'
import { CoverUpload, GalleryUpload } from './ImageUpload'
import { AuthorPicker, AuthorEntry, newAuthorEntry } from './AuthorPicker'
import { LoadingView, ErrorState } from './States'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { canWriteCatalog, canAdministerOrg } from '@/lib/types'
import type { BookDetail, BookPayload, Genre, WorkKind, AuthorRole } from '@/lib/types'
import { colors, fonts, spacing } from '@/lib/theme'

interface WorkMatch {
  workId: string
  titleBn: string
  authors: string[]
  publisherNameBn: string | null
  publishYear: number | null
  isbnMatch: boolean
}

/**
 * The one product form, used for both `catalog/new` and `catalog/[id]`. It is
 * a field-for-field port of the web BookForm: the mobile app used to expose
 * only a stock box, which meant a stall could not actually list anything from
 * the phone.
 *
 * Everything is a string in state (as in the web form) so a half-typed
 * number never becomes NaN; `buildPayload` does the single conversion, and
 * an empty box means null, i.e. "clear this field", which is what the PUT
 * schema expects.
 */
export function ProductForm({ editionId }: { editionId?: string }) {
  const router = useRouter()
  const { persona, orgMemberships } = useAuth()
  const isEdit = !!editionId

  const membership = useMemo(
    () => (persona?.kind === 'stall' ? orgMemberships.find((m) => m.organization.id === persona.orgId) : undefined),
    [persona, orgMemberships]
  )
  // A legacy publisher's implicit OWNER seat is not in the stall list the
  // app loads, so "no membership found" must mean "let the server decide"
  // rather than "read-only" — otherwise those stalls cannot list anything.
  const role = membership?.role
  const canWrite = role ? canWriteCatalog(role) : true
  const canDelete = role ? canAdministerOrg(role) : true

  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [kind, setKind] = useState<WorkKind>('BOOK')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [titleBn, setTitleBn] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [isbn, setIsbn] = useState('')
  const [publishYear, setPublishYear] = useState('')
  const [pageCount, setPageCount] = useState('')
  const [authors, setAuthors] = useState<AuthorEntry[]>([newAuthorEntry()])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [priceIn, setPriceIn] = useState('')
  const [priceBd, setPriceBd] = useState('')
  const [trackInventory, setTrackInventory] = useState(false)
  const [stockIn, setStockIn] = useState('')
  const [stockBd, setStockBd] = useState('')
  const [gstRatePercent, setGstRatePercent] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [lengthMm, setLengthMm] = useState('')
  const [widthMm, setWidthMm] = useState('')
  const [heightMm, setHeightMm] = useState('')
  const [description, setDescription] = useState('')
  const [isPublicDomain, setIsPublicDomain] = useState(false)
  const [ebookUrl, setEbookUrl] = useState('')
  const [ebookPages, setEbookPages] = useState('')
  const [spotlightUrl, setSpotlightUrl] = useState('')
  const [spotlightSource, setSpotlightSource] = useState<string | null>(null)
  const [loadedSpotlightUrl, setLoadedSpotlightUrl] = useState<string | null>(null)

  const [genres, setGenres] = useState<Genre[]>([])
  const [genresError, setGenresError] = useState(false)

  const isBook = kind === 'BOOK'

  // The web form hardcodes eight genre slugs; the API is the real list, and a
  // slug that is not in the database is a 400 on submit.
  useEffect(() => {
    let alive = true
    api
      .get<{ data: Genre[] }>('/api/genres')
      .then((res) => {
        if (alive) setGenres(res.data ?? [])
      })
      .catch(() => {
        if (alive) setGenresError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!editionId) return
    let alive = true
    setLoading(true)
    api
      .get<{ data: BookDetail }>(`/api/publisher/books/${editionId}`)
      .then(({ data }) => {
        if (!alive) return
        const priceIN = data.prices.find((p) => p.region === 'IN')
        const priceBD = data.prices.find((p) => p.region === 'BD')
        setKind(data.kind)
        setCoverUrl(data.coverUrl)
        setImages(data.images ?? [])
        setTitleBn(data.titleBn ?? '')
        setTitleEn(data.titleEn ?? '')
        setIsbn(data.isbn ?? '')
        setPublishYear(data.publishYear != null ? String(data.publishYear) : '')
        setPageCount(data.pageCount != null ? String(data.pageCount) : '')
        setAuthors(
          data.authors.length
            ? data.authors.map((a) => ({
                ...newAuthorEntry(),
                authorId: a.authorId,
                nameBn: a.nameBn,
                nameEn: a.nameEn ?? '',
                role: a.role as AuthorRole,
                isNew: false,
                status: a.status,
              }))
            : [newAuthorEntry()]
        )
        setSelectedGenres(data.genres.map((g) => g.slug))
        setPriceIn(priceIN ? String(priceIN.price) : '')
        setPriceBd(priceBD ? String(priceBD.price) : '')
        setTrackInventory(priceIN?.trackInventory ?? priceBD?.trackInventory ?? false)
        setStockIn(priceIN ? String(priceIN.stock) : '')
        setStockBd(priceBD ? String(priceBD.stock) : '')
        const gst = priceIN?.gstRatePercent ?? priceBD?.gstRatePercent
        setGstRatePercent(gst != null ? String(gst) : '')
        setHsnCode(data.hsnCode ?? '')
        setWeightGrams(data.weightGrams != null ? String(data.weightGrams) : '')
        setLengthMm(data.lengthMm != null ? String(data.lengthMm) : '')
        setWidthMm(data.widthMm != null ? String(data.widthMm) : '')
        setHeightMm(data.heightMm != null ? String(data.heightMm) : '')
        setDescription(data.excerpt ?? '')
        setIsPublicDomain(data.isPublicDomain)
        setEbookUrl(data.ebook?.fileUrl ?? '')
        setEbookPages(data.ebook?.totalPages != null ? String(data.ebook.totalPages) : '')
        setSpotlightUrl(data.spotlightUrl ?? '')
        setLoadedSpotlightUrl(data.spotlightUrl)
        setSpotlightSource(data.spotlightSource)
        setLoadError(null)
      })
      .catch((err) => {
        if (alive) setLoadError(err instanceof ApiError ? err.message : 'বই লোড করতে সমস্যা হয়েছে')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [editionId])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!titleBn.trim()) next.titleBn = 'বাংলা শিরোনাম আবশ্যক'
    if (!titleEn.trim()) next.titleEn = 'ইংরেজি শিরোনাম আবশ্যক'
    if (isBook) {
      const valid = authors.filter((a) => a.authorId || (a.isNew && a.nameBn.trim()))
      if (valid.length === 0) next.authors = 'কমপক্ষে একজন লেখক প্রয়োজন'
      if (selectedGenres.length === 0) next.genres = 'কমপক্ষে একটি বিষয় প্রয়োজন'
    }
    if (!isPublicDomain && !priceIn && !priceBd) {
      next.price = 'কমপক্ষে একটি মূল্য দিন, অথবা পাবলিক ডোমেইন চিহ্নিত করুন'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const num = (value: string): number | null => (value.trim() === '' ? null : Number(value))

  function buildPayload(): BookPayload {
    const chosenAuthors = authors
      .filter((a) => a.authorId || (a.isNew && a.nameBn.trim()))
      .map((a) => ({
        authorId: a.authorId ?? undefined,
        nameBn: a.nameBn.trim() || undefined,
        nameEn: a.nameEn.trim() || undefined,
        role: a.role,
      }))

    return {
      kind,
      coverUrl,
      images,
      titleBn: titleBn.trim(),
      titleEn: titleEn.trim(),
      isbn: isbn.trim() || null,
      publishYear: num(publishYear),
      pageCount: num(pageCount),
      // On PUT these two are `.min(1)` — sending the empty arrays a MERCH
      // item legitimately has would 400. Absent means "leave unchanged".
      ...(isEdit && chosenAuthors.length === 0 ? {} : { authors: chosenAuthors }),
      ...(isEdit && selectedGenres.length === 0 ? {} : { genreSlugs: selectedGenres }),
      priceIN: num(priceIn),
      priceBD: num(priceBd),
      trackInventory,
      stockIN: trackInventory ? num(stockIn) : null,
      stockBD: trackInventory ? num(stockBd) : null,
      gstRatePercent: num(gstRatePercent),
      hsnCode: hsnCode.trim() || null,
      weightGrams: num(weightGrams),
      lengthMm: num(lengthMm),
      widthMm: num(widthMm),
      heightMm: num(heightMm),
      excerpt: description.trim() || null,
      isPublicDomain,
      ebookFile: ebookUrl.trim() || null,
      ebookPages: num(ebookPages),
      // Resending the same url rewrites spotlightSource to
      // PUBLISHER_PROVIDED, so an AI-generated image would be relabelled by
      // an unrelated save. Only send it when the field actually changed.
      ...(spotlightUrl.trim() === (loadedSpotlightUrl ?? '') ? {} : { spotlightUrl: spotlightUrl.trim() || null }),
    }
  }

  async function submit(attachToWorkId?: string) {
    setSaving(true)
    try {
      const body = { ...buildPayload(), ...(attachToWorkId ? { attachToWorkId } : {}) }
      const res = isEdit
        ? await api.put<{ data: { id: string; proposedAuthors?: string[] } }>(`/api/publisher/books/${editionId}`, body)
        : await api.post<{ data: { id: string; proposedAuthors?: string[] } }>('/api/publisher/books', body)

      const proposed = res.data?.proposedAuthors ?? []
      const note = proposed.length
        ? `\n\n${proposed.join(', ')} — অনুমোদনের অপেক্ষায়। অনুমোদনের পর সব প্রকাশকের তালিকায় যুক্ত হবেন।`
        : ''
      Alert.alert('সংরক্ষিত হয়েছে', (attachToWorkId ? 'নতুন সংস্করণ হিসেবে যুক্ত হয়েছে।' : 'পণ্যটি সংরক্ষিত হয়েছে।') + note, [
        { text: 'ঠিক আছে', onPress: () => router.replace('/catalog') },
      ])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'সংরক্ষণে সমস্যা হয়েছে'
      const details = err instanceof ApiError ? (err.body as any)?.details : null
      const fieldMessages = details && typeof details === 'object' ? Object.values(details).flat().join('\n') : ''
      Alert.alert('সংরক্ষণ করা যায়নি', fieldMessages ? `${message}\n${fieldMessages}` : message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!validate()) {
      Alert.alert('কিছু তথ্য বাকি আছে', 'লাল দাগ দেওয়া ঘরগুলি দেখে নিন।')
      return
    }
    // Create only: the same book may already exist as another publisher's
    // edition, and attaching keeps the two on one Work page.
    if (!isEdit) {
      try {
        const params = new URLSearchParams()
        if (titleBn.trim()) params.set('titleBn', titleBn.trim())
        if (titleEn.trim()) params.set('titleEn', titleEn.trim())
        if (isbn.trim()) params.set('isbn', isbn.trim())
        const res = await api.get<{ data: { matches: WorkMatch[] } }>(`/api/publisher/works/match?${params.toString()}`)
        const matches = res.data?.matches ?? []
        if (matches.length > 0) {
          const first = matches[0]
          Alert.alert(
            `এটি কি “${first.titleBn}”-এর একটি সংস্করণ?`,
            [first.authors.join(', '), first.publisherNameBn, first.publishYear ? String(first.publishYear) : null]
              .filter(Boolean)
              .join(' · '),
            [
              { text: 'হ্যাঁ, সংস্করণ হিসেবে যুক্ত করুন', onPress: () => submit(first.workId) },
              { text: 'না, নতুন বই তৈরি করুন', onPress: () => submit() },
              { text: 'বাতিল', style: 'cancel' },
            ]
          )
          return
        }
      } catch {
        // Matching is best-effort — never block a save on it.
      }
    }
    await submit()
  }

  function handleDelete() {
    Alert.alert('মুছে ফেলবেন?', 'এই পণ্যটি তালিকা থেকে সরে যাবে। এটি ফেরানো যায় না।', [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছে ফেলুন',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try {
            await api.delete(`/api/publisher/books/${editionId}`)
            router.replace('/catalog')
          } catch (err) {
            Alert.alert('মুছতে সমস্যা', err instanceof ApiError ? err.message : 'আবার চেষ্টা করুন')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  if (loading) return <LoadingView label="লোড হচ্ছে..." />
  if (loadError) return <ErrorState message={loadError} />

  if (!canWrite) {
    return <ErrorState message="আপনার সিটে ক্যাটালগ সম্পাদনার অনুমতি নেই — স্টলের মালিককে বলুন।" />
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!isEdit ? (
          <Section title="কী যোগ করছেন?">
            <ChoiceField
              value={kind}
              onChange={setKind}
              options={[
                { value: 'BOOK', label: 'বই' },
                { value: 'MERCH', label: 'অন্যান্য সামগ্রী' },
              ]}
            />
            <Text style={styles.note}>
              সামগ্রীর ক্ষেত্রে লেখক ও বিষয় দিতে হয় না।
            </Text>
          </Section>
        ) : null}

        <Section title="ছবি" hint="প্রথম ছবিটিই তালিকায় দেখা যায়।">
          <CoverUpload value={coverUrl} onChange={setCoverUrl} hint="১০ এমবি-র কম, JPEG/PNG/WebP" />
          <GalleryUpload value={images} onChange={setImages} />
        </Section>

        <Section title="মৌলিক তথ্য">
          <TextField label="শিরোনাম (বাংলা)" required value={titleBn} onChangeText={setTitleBn} error={errors.titleBn} />
          <TextField
            label="Title (English)"
            required
            value={titleEn}
            onChangeText={setTitleEn}
            error={errors.titleEn}
            autoCapitalize="words"
          />
          {isBook ? (
            <>
              <TextField label="ISBN" placeholder="978-..." value={isbn} onChangeText={setIsbn} autoCapitalize="none" />
              <TextField label="প্রকাশনার বছর" numeric maxLength={4} value={publishYear} onChangeText={setPublishYear} />
              <TextField label="পৃষ্ঠা সংখ্যা" numeric value={pageCount} onChangeText={setPageCount} />
            </>
          ) : null}
        </Section>

        {isBook ? (
          <Section title="লেখক" hint="তালিকায় না থাকলে নাম লিখে নতুন লেখক প্রস্তাব করুন।">
            <AuthorPicker authors={authors} onChange={setAuthors} error={errors.authors} />
          </Section>
        ) : null}

        {isBook ? (
          <Section title="বিষয়">
            {genresError ? <Text style={styles.note}>বিষয়ের তালিকা লোড করা যায়নি — ইন্টারনেট দেখে আবার খুলুন।</Text> : null}
            <ChipRow>
              {genres.map((g) => (
                <Chip
                  key={g.slug}
                  label={g.nameBn}
                  active={selectedGenres.includes(g.slug)}
                  onPress={() =>
                    setSelectedGenres((prev) =>
                      prev.includes(g.slug) ? prev.filter((s) => s !== g.slug) : [...prev, g.slug]
                    )
                  }
                />
              ))}
            </ChipRow>
            <FieldError message={errors.genres} />
          </Section>
        ) : null}

        <Section title="মূল্য ও স্টক">
          <TextField
            label="ভারত (₹)"
            decimal
            value={priceIn}
            onChangeText={setPriceIn}
            editable={!isPublicDomain}
            hint={isPublicDomain ? 'পাবলিক ডোমেইন — মূল্য দেওয়া যায় না' : undefined}
          />
          <TextField label="বাংলাদেশ (৳)" decimal value={priceBd} onChangeText={setPriceBd} editable={!isPublicDomain} />
          <FieldError message={errors.price} />
          {!isPublicDomain ? (
            <ToggleRow
              label="স্টক হিসাব রাখুন"
              hint="বন্ধ থাকলে স্টক অসীম ধরা হয়।"
              value={trackInventory}
              onValueChange={setTrackInventory}
            />
          ) : null}
          {trackInventory && !isPublicDomain ? (
            <>
              <TextField label="ভারতে কত কপি" numeric value={stockIn} onChangeText={setStockIn} />
              <TextField label="বাংলাদেশে কত কপি" numeric value={stockBd} onChangeText={setStockBd} />
            </>
          ) : null}
        </Section>

        <Section title="জিএসটি" hint="ভারতের দামের মধ্যেই জিএসটি ধরা থাকে।">
          <TextField label="জিএসটি হার (%)" decimal placeholder="যেমন ১৮" value={gstRatePercent} onChangeText={setGstRatePercent} />
          <TextField label="এইচএসএন কোড" placeholder="যেমন 4901" maxLength={16} value={hsnCode} onChangeText={setHsnCode} autoCapitalize="characters" />
        </Section>

        <Section title="ডেলিভারির মাপ" hint="ওজন না দিলে প্ল্যাটফর্মের আন্দাজি ওজনে কুরিয়ার খরচ ধরা হয়।">
          <TextField label="ওজন (গ্রাম)" numeric placeholder="যেমন ৪০০" value={weightGrams} onChangeText={setWeightGrams} />
          <TextField label="লম্বা (মিমি)" numeric value={lengthMm} onChangeText={setLengthMm} />
          <TextField label="চওড়া (মিমি)" numeric value={widthMm} onChangeText={setWidthMm} />
          <TextField label="উচ্চতা (মিমি)" numeric value={heightMm} onChangeText={setHeightMm} />
        </Section>

        <Section title="বিবরণ">
          <TextField
            label={`সংক্ষিপ্ত বিবরণ (${description.length}/১০০০)`}
            placeholder="বইয়ের সংক্ষিপ্ত বিবরণ বা উদ্ধৃতি..."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
          />
        </Section>

        <Section title="অতিরিক্ত বিকল্প">
          <ToggleRow
            label="পাবলিক ডোমেইন"
            hint="চিহ্নিত করলে মূল্য মুছে যাবে — বইটি বিনামূল্যে পড়া যাবে।"
            value={isPublicDomain}
            onValueChange={(next) => {
              setIsPublicDomain(next)
              if (next) {
                setPriceIn('')
                setPriceBd('')
                setTrackInventory(false)
              }
            }}
          />
          <TextField label="ই-বুক ফাইল URL" placeholder="https://..." value={ebookUrl} onChangeText={setEbookUrl} autoCapitalize="none" />
          <TextField label="ই-বুকের মোট পৃষ্ঠা" numeric value={ebookPages} onChangeText={setEbookPages} />
          <TextField
            label="প্রচারমূলক ছবির URL"
            placeholder="https://..."
            value={spotlightUrl}
            onChangeText={setSpotlightUrl}
            autoCapitalize="none"
            hint={spotlightSource === 'AI_GENERATED' ? 'এখনকার ছবিটি AI-তে তৈরি — নিজের ছবি দিলে সেটিই বসবে।' : undefined}
          />
        </Section>

        <Button label={isEdit ? 'পরিবর্তন সংরক্ষণ করুন' : 'পণ্য যোগ করুন'} onPress={handleSave} loading={saving} />
        <Button label="বাতিল" variant="secondary" onPress={() => router.back()} />
        {isEdit && canDelete ? <Button label="মুছে ফেলুন" variant="danger" onPress={handleDelete} loading={deleting} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.parchment },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  note: { fontFamily: fonts.sansRegular, fontSize: 12, color: colors.secondary },
})
