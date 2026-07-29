CREATE TABLE "guilds" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"notification_channel_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "guild_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_guild_id_idx" ON "guilds" USING btree ("guild_id");