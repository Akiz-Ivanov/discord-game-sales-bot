import { upsertUser, getUserByDiscordId } from '@/repositories/users'
import { upsertGame } from '@/repositories/games'
import {
  addWishlistItem,
  removeWishlistItem,
  listWishlistItems,
  countWishlistItems,
} from '@/repositories/wishlist'
import { getGamePrices } from '@/services/prices'
import type {
  ItadGame,
  AddToWishlistResult,
  RemoveFromWishlistResult,
} from '@/types'
import { pickCheapestDeal } from '@/lib/pickCheapestDeal'
import { WISHLIST_LIMIT } from '@/lib/constants'

export const addGameToWishlist = async (
  discordId: string,
  guildId: string,
  game: ItadGame
): Promise<AddToWishlistResult> => {
  const user = await upsertUser(discordId, guildId)
  const gameRow = await upsertGame(game)

  const currentCount = await countWishlistItems(user.id)
  if (currentCount >= WISHLIST_LIMIT) {
    return { status: 'limit_reached' }
  }

  const priceSnapshot = await getGamePrices(gameRow.id, game.id)
  const cheapest = pickCheapestDeal(priceSnapshot.deals)
  const initialPrice =
    cheapest && cheapest.cut > 0 ? cheapest.price.amountInt : undefined

  const row = await addWishlistItem(user.id, gameRow.id, initialPrice)

  return row
    ? { status: 'added', priceSnapshot }
    : { status: 'already_exists', priceSnapshot }
}

export const removeGameFromWishlist = async (
  userId: number,
  gameId: number
): Promise<RemoveFromWishlistResult> => {
  const removed = await removeWishlistItem(userId, gameId)
  return removed ? { status: 'removed' } : { status: 'not_found' }
}

export const getWishlist = async (discordId: string) => {
  const user = await getUserByDiscordId(discordId)
  if (!user) return []

  return listWishlistItems(user.id)
}
