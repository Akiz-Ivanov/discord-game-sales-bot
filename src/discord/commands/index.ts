import type { CommandHandler } from '@/types/discord'
import { ping } from './ping'
import { price } from './price'

export const commands: Record<string, CommandHandler> = {
  ping,
  price,
}
