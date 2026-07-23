CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"itad_id" uuid NOT NULL,
	"steam_app_id" integer,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"history_low_amount" integer,
	"history_low_currency" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"shop_name" text NOT NULL,
	"price_amount" integer NOT NULL,
	"regular_amount" integer NOT NULL,
	"cut" integer NOT NULL,
	"currency" text NOT NULL,
	"url" text NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_id" integer NOT NULL,
	"last_notified_price" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "games_itad_id_idx" ON "games" USING btree ("itad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_discord_id_idx" ON "users" USING btree ("discord_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_user_game_idx" ON "wishlist_items" USING btree ("user_id","game_id");