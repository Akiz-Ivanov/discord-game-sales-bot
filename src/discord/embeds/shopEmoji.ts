import { customEmojiTag } from './discordEmoji'

const SHOP_EMOJI_IDS: Record<string, string> = {
  Steam: '1530578986965405726',
  GOG: '1530581772327321720',
  'Humble Store': '1538946695029850313',
  'Epic Game Store': '1530581293744521246',
  Fanatical: '1538944690303406080',
}

export const getShopEmoji = (shopName: string): string => {
  const id = SHOP_EMOJI_IDS[shopName]
  if (!id) return ''
  const name = shopName.toLowerCase().replace(/\s+/g, '')
  return `${customEmojiTag(name, id)} `
}
