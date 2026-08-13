import type { CommandHandler } from '@/types'
import { ping } from './ping'
import { price } from './price'
import { wishlist } from './wishlist'
import { config } from './config'
import { free } from './free'
import { help } from './help'

export const commands: Record<string, CommandHandler> = {
  ping,
  price,
  wishlist,
  config,
  free,
  help,
}
