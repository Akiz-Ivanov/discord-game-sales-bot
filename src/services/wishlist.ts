import { upsertUser, getUserByDiscordId } from '@/repositories/users'
import { upsertGame } from '@/repositories/games'
import {
  addWishlistItem,
  removeWishlistItem,
  listWishlistItems,
} from '@/repositories/wishlist'
import type {
  ItadGame,
  AddToWishlistResult,
  RemoveFromWishlistResult,
} from '@/types'

export const addGameToWishlist = async (
  discordId: string,
  guildId: string,
  game: ItadGame
): Promise<AddToWishlistResult> => {
  const user = await upsertUser(discordId, guildId)
  const gameRow = await upsertGame(game)
  const row = await addWishlistItem(user.id, gameRow.id)

  return row ? { status: 'added' } : { status: 'already_exists' }
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
