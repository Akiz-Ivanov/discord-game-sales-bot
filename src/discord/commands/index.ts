import type { CommandHandler } from '@/types'
import { ping } from './ping'
import { price } from './price'
import { wishlist } from './wishlist'

export const commands: Record<string, CommandHandler> = {
  ping,
  price,
  wishlist,
}
