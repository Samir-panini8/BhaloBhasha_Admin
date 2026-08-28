// Mirrors the design tokens in the web app's globals.css (see CLAUDE.md in
// the bhalo-bhasha repo) so the admin app reads as the same product, not a
// bolted-on tool. Never inline a hex value in a screen — add a token here.
export const colors = {
  parchment: '#FAF6EE',
  night: '#161511',
  nightText: '#F3EEE2',

  navy: '#1B3A5C',
  navyMid: '#3B6A96',
  navyDeep: '#122840',
  navyMist: '#EBF0F5',

  heading: '#2D2D2D',
  body: '#4A4A4A',
  secondary: '#7A7A7A',
  border: '#D4D0C8',

  error: '#D94B4B',
  warning: '#D4952B',
  success: '#2E8B57',
  successLight: '#E8F5E8',

  white: '#FFFFFF',

  // পিলার অ্যাকসেন্ট — used sparingly to badge which marketplace a stall/order
  // belongs to (books / creators / artisans).
  pillar: {
    pan: '#66784F',
    sindoor: '#B5432F',
    gada: '#C98A2D',
    poramati: '#A65B3B',
    slate: '#6C7A89',
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const

// Font family names as registered by useFonts() in app/_layout.tsx.
export const fonts = {
  sansRegular: 'NotoSansBengali_400Regular',
  sansMedium: 'NotoSansBengali_500Medium',
  sansBold: 'NotoSansBengali_700Bold',
  serifRegular: 'NotoSerifBengali_400Regular',
  serifMedium: 'NotoSerifBengali_500Medium',
  serifBold: 'NotoSerifBengali_700Bold',
} as const

export const typography = {
  title: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.heading },
  heading: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.heading },
  subheading: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.heading },
  body: { fontFamily: fonts.sansRegular, fontSize: 15, color: colors.body },
  caption: { fontFamily: fonts.sansRegular, fontSize: 13, color: colors.secondary },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.secondary },
} as const
