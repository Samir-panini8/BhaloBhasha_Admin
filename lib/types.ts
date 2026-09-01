// Mirrors the shapes returned by the bhalo-bhasha Next.js API
// (src/lib/auth.ts, src/lib/org-roles.ts, prisma/schema.prisma).

export type Role = 'ADMIN' | 'READER' | 'PUBLISHER'
export type Country = 'IN' | 'BD'
export type OrgType = 'PUBLISHER' | 'SELLER' | 'PUBLISHER_AND_SELLER' | 'ARTIST' | 'ARTISAN'
export type OrgRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER'

export interface AuthUser {
  id: string
  nameBn: string
  nameEn?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  country?: Country
  roles: Role[]
}

export interface OrgMembership {
  organization: {
    id: string
    nameBn: string
    nameEn?: string | null
    slug?: string
    type: OrgType
    typeLabel?: string
    logoUrl?: string | null
  }
  role: OrgRole
}

// The two personas this app switches between. A "stall" persona is always
// scoped to one Organization id, matching the x-active-org header contract.
export type Persona = { kind: 'platform-admin' } | { kind: 'stall'; orgId: string }

export function canAdministerOrg(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function canWriteCatalog(role: OrgRole): boolean {
  return role !== 'VIEWER'
}

// ---------------------------------------------------------------------------
// Catalogue. The backend spine is Work → Edition → Listing, but the
// publisher API flattens it: an id in these types is always an *Edition* id,
// and `prices` is the edition's active listings, one per region.
// ---------------------------------------------------------------------------

export type WorkKind = 'BOOK' | 'MERCH'
export type AuthorRole = 'AUTHOR' | 'TRANSLATOR' | 'EDITOR' | 'ILLUSTRATOR'
export type Region = 'IN' | 'BD'
export type Currency = 'INR' | 'BDT'

export interface ListingPrice {
  region: Region
  price: number
  currency: Currency
  stock: number
  trackInventory: boolean
  gstRatePercent?: number | null
}

export interface CatalogItem {
  id: string
  kind: WorkKind
  titleBn: string
  titleEn: string | null
  slug: string
  isbn: string | null
  coverUrl: string | null
  images: string[]
  isPublicDomain: boolean
  hasEbook: boolean
  authors: Array<{ nameBn: string; nameEn: string | null; role: AuthorRole }>
  prices: ListingPrice[]
  genres: Array<{ nameBn: string; slug: string }>
  views7d: number
  orders7d: number
  pickedAt: string | null
}

export interface BookDetail {
  id: string
  workId: string
  kind: WorkKind
  titleBn: string
  titleEn: string | null
  slug: string
  isbn: string | null
  /** Named `excerpt` by the API but stored as the work's description. */
  excerpt: string | null
  coverUrl: string | null
  images: string[]
  pageCount: number | null
  publishYear: number | null
  isPublicDomain: boolean
  authors: Array<{
    authorId: string
    nameBn: string
    nameEn: string | null
    role: AuthorRole
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    canEditDirectly: boolean
    canSuggestEdit: boolean
  }>
  genres: Array<{ genreId: string; nameBn: string; nameEn: string | null; slug: string }>
  prices: ListingPrice[]
  hsnCode: string | null
  weightGrams: number | null
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  spotlightUrl: string | null
  spotlightSource: 'AI_GENERATED' | 'PUBLISHER_PROVIDED' | null
  ebook: { fileUrl: string; format: string | null; totalPages: number | null } | null
}

/** Exactly the body /api/publisher/books accepts (POST) and takes back (PUT). */
export interface BookPayload {
  kind: WorkKind
  titleBn: string
  titleEn: string
  isbn: string | null
  publishYear: number | null
  pageCount: number | null
  /** Omitted on update when empty — the PUT schema requires at least one. */
  authors?: Array<{ authorId?: string; nameBn?: string; nameEn?: string; role: AuthorRole }>
  genreSlugs?: string[]
  /** Omitted when unchanged, so an AI spotlight is not relabelled. */
  spotlightUrl?: string | null
  coverUrl: string | null
  images: string[]
  priceIN: number | null
  priceBD: number | null
  trackInventory: boolean
  stockIN: number | null
  stockBD: number | null
  gstRatePercent: number | null
  hsnCode: string | null
  weightGrams: number | null
  lengthMm: number | null
  widthMm: number | null
  heightMm: number | null
  excerpt: string | null
  isPublicDomain: boolean
  ebookFile: string | null
  ebookPages: number | null
  attachToWorkId?: string
}

export interface Genre {
  id: string
  nameBn: string
  nameEn: string
  slug: string
}

export interface AuthorSuggestion {
  id: string
  nameBn: string
  nameEn: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  bookCount: number
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type StallResponse = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface OrderAddress {
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  phone?: string | null
}

export interface Shipment {
  id: string
  zone: string
  billableGrams: number
  weightAssumed: boolean
  shippingCharge: number
  status: string
  awbNumber: string | null
  lastError: string | null
  stallNameBn?: string | null
}

/** GET /api/publisher/orders — a stall never sees the order-level total. */
export interface StallOrder {
  id: string
  displayId: string
  userName: string
  userPhone: string | null
  status: OrderStatus
  currency: Currency
  createdAt: string
  isGift: boolean
  paymentGateway: string | null
  stallSubtotal: number
  stallUnits: number
  itemCount: number
  isSoleStall: boolean
  stallResponse: StallResponse
  stallResponseReason: string | null
  stallRespondedAt: string | null
  items: Array<{ id: string; bookId: string | null; bookTitle: string; quantity: number; price: number; netAmount: number }>
  address: OrderAddress | null
  shipments: Shipment[]
}

/** GET /api/admin/book-orders */
export interface AdminOrder {
  id: string
  userId: string
  userName: string
  userPhone: string | null
  itemCount: number
  total: number
  discount: number
  taxTotal: number | null
  shippingTotal: number | null
  currency: Currency
  status: OrderStatus
  paymentGateway: string | null
  paymentRef: string | null
  isGift: boolean
  createdAt: string
  stalls: Array<{
    id: string
    nameBn: string
    slug: string
    type: OrgType
    response: StallResponse
    responseReason: string | null
    respondedAt: string | null
  }>
  items: Array<{ bookId: string | null; bookTitle: string; stallId: string | null; stallNameBn: string | null; quantity: number; price: number }>
  address: OrderAddress | null
  shipments?: Shipment[]
}

export const ORDER_STATUS_BN: Record<OrderStatus, string> = {
  PENDING: 'অপেক্ষমাণ',
  PAID: 'পরিশোধিত',
  SHIPPED: 'প্রেরিত',
  DELIVERED: 'বিতরণকৃত',
  CANCELLED: 'বাতিল',
}

export const STALL_RESPONSE_BN: Record<StallResponse, string> = {
  PENDING: 'উত্তরের অপেক্ষায়',
  ACCEPTED: 'গৃহীত',
  DECLINED: 'ফেরানো হয়েছে',
}

export function orderStatusTone(status: OrderStatus): 'warning' | 'navy' | 'success' | 'error' {
  if (status === 'PENDING') return 'warning'
  if (status === 'CANCELLED') return 'error'
  if (status === 'DELIVERED') return 'success'
  return 'navy'
}

export function stallResponseTone(response: StallResponse): 'warning' | 'success' | 'error' {
  return response === 'PENDING' ? 'warning' : response === 'ACCEPTED' ? 'success' : 'error'
}

// ---------------------------------------------------------------------------
// Organizations (স্টল)
// ---------------------------------------------------------------------------

export type OrgAccentTint = 'PAAN' | 'SINDOOR' | 'GADA' | 'PORAMATI' | 'SLATE'

export interface OrganizationDetail {
  id: string
  name: string
  nameBn: string
  slug: string
  type: OrgType
  description: string | null
  descriptionBn: string | null
  ethosBn: string | null
  locationBn: string | null
  foundedYear: number | null
  accentTint: OrgAccentTint
  logoUrl: string | null
  coverImageUrl: string | null
  website: string | null
  email: string | null
  phone: string | null
  originPostalCode: string | null
  gstin: string | null
  country: Country
  isVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { members?: number; editions?: number; listings?: number }
}

export const ORG_TYPE_BN: Record<OrgType, string> = {
  PUBLISHER: 'প্রকাশক',
  SELLER: 'বিক্রেতা',
  PUBLISHER_AND_SELLER: 'প্রকাশক ও বিক্রেতা',
  ARTIST: 'শিল্পী',
  ARTISAN: 'কারুশিল্পী',
}

export const ORG_ROLE_BN: Record<OrgRole, string> = {
  OWNER: 'মালিক',
  ADMIN: 'অ্যাডমিন',
  STAFF: 'কর্মী',
  VIEWER: 'দর্শক',
}

/** ৳ for taka, ₹ for rupee — the two were swapped in several screens. */
export function currencySymbol(currency: Currency | string): string {
  return currency === 'INR' ? '₹' : currency === 'BDT' ? '৳' : String(currency)
}

export function formatMoney(amount: number, currency: Currency | string): string {
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return `${currencySymbol(currency)}${rounded}`
}

export function formatDateBn(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('bn-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
