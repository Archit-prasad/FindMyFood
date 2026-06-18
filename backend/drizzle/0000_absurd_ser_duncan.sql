CREATE TYPE "public"."reservation_status" AS ENUM('upcoming', 'seated', 'no_show', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shape" AS ENUM('circle', 'rectangle');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('available', 'held', 'occupied');--> statement-breakpoint
CREATE TABLE "combinable_table_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"table_ids" uuid[] NOT NULL,
	"combined_capacity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" real NOT NULL,
	"category" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"table_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"diner_name" varchar(255) NOT NULL,
	"diner_phone" varchar(50) NOT NULL,
	"party_size" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"status" "reservation_status" DEFAULT 'upcoming' NOT NULL,
	"lookup_code" varchar(8) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"cuisine_type" varchar(100) NOT NULL,
	"price_tier" integer NOT NULL,
	"popularity_score" real DEFAULT 0 NOT NULL,
	"hours" text NOT NULL,
	"manager_access_token" uuid DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"table_number" integer NOT NULL,
	"capacity" integer NOT NULL,
	"shape" "shape" NOT NULL,
	"x_pos" real NOT NULL,
	"y_pos" real NOT NULL,
	"rotation" real DEFAULT 0 NOT NULL,
	"status" "table_status" DEFAULT 'available' NOT NULL,
	"status_updated_at" timestamp DEFAULT now() NOT NULL,
	"reserved_until" timestamp
);
--> statement-breakpoint
ALTER TABLE "combinable_table_groups" ADD CONSTRAINT "combinable_table_groups_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_tables" ADD CONSTRAINT "reservation_tables_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;