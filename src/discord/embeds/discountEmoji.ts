import { customEmojiTag } from './discordEmoji'

// Where "big" discount starts — arbitrary starting point (half-off felt
// like a natural line), easy to retune once you've seen it rendered.
const BIG_DISCOUNT_THRESHOLD = 50

const CARET_DOUBLE_DOWN_ID = '1530575294711337120' // caretcircledoubledownfill1
const CARET_DOWN_ID = '1530576295199768637' // caretcircledown

//* No icon at all when cut is 0 — only sale listings get a caret.
export const getDiscountEmoji = (cut: number): string => {
  if (cut >= BIG_DISCOUNT_THRESHOLD)
    return `${customEmojiTag('caretcircledoubledownfill1', CARET_DOUBLE_DOWN_ID)} `
  if (cut > 0) return `${customEmojiTag('caretcircledown', CARET_DOWN_ID)} `
  return ''
}
