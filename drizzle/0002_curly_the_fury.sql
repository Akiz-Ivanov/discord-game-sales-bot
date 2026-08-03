ALTER TABLE "prices" ADD COLUMN "checked_date" date;
--> statement-breakpoint
UPDATE "prices" SET "checked_date" = "checked_at"::date;
--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "checked_date" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "prices_game_shop_date_idx" ON "prices" USING btree ("game_id","shop_id","checked_date");