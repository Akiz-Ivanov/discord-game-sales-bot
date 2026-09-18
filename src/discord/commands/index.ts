import type { CommandHandler } from '@/types'
import { price } from './price'
import { wishlist } from './wishlist'
import { config } from './config'
import { free } from './free'
import { help } from './help'
import { forgetMe } from './forgetMe'
import { privacyPolicy } from './privacyPolicy'
import { feedback } from './feedback'
import { about } from './about'
import { trending } from './trending'
import { quickAccess } from './quickAccess'
import { bundlesList } from './bundlesList'

export const commands: Record<string, CommandHandler> = {
  price,
  wishlist,
  config,
  free,
  help,
  'forget-me': forgetMe,
  'privacy-policy': privacyPolicy,
  feedback,
  about,
  trending,
  'Quick access': quickAccess,
  bundles: bundlesList,
}
