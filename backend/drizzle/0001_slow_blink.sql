CREATE TYPE "public"."landmark_type" AS ENUM('entrance', 'window', 'restroom', 'reception', 'bar', 'kitchen');--> statement-breakpoint
CREATE TABLE "landmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"type" "landmark_type" NOT NULL,
	"x_pos" real NOT NULL,
	"y_pos" real NOT NULL,
	"label" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "landmarks" ADD CONSTRAINT "landmarks_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;