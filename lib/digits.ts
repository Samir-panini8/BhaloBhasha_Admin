// Bengali (০-৯) and Eastern-Arabic (٠-٩) digits are what a Bengali keyboard
// or a pasted number actually produces; they are folded to ASCII rather than
// dropped, because dropping them looks to the user like the field is broken.
const DIGIT_FOLD: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

/**
 * Keeps only digits. Phone and OTP fields run every keystroke and every
 * paste through this — a `keyboardType` is a hint to the keyboard, not a
 * constraint on the value, and hardware keyboards, autofill and paste all
 * bypass it.
 */
export function digitsOnly(input: string): string {
  let out = ''
  for (const char of input) {
    const folded = DIGIT_FOLD[char] ?? char
    if (folded >= '0' && folded <= '9') out += folded
  }
  return out
}
