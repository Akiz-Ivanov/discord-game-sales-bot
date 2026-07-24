import { db } from '@/db'
import { sql } from 'drizzle-orm'

export const resetDb = async () => {
  await db.execute(
    sql`TRUNCATE TABLE prices, wishlist_items, games, users RESTART IDENTITY CASCADE`
  )
}
