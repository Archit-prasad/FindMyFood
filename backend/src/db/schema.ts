import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const shapeEnum = pgEnum("shape", ["circle", "rectangle"]);
export const tableStatusEnum = pgEnum("table_status", [
  "available",
  "held",
  "occupied",
]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "upcoming",
  "seated",
  "no_show",
  "completed",
  "cancelled",
]);

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  cuisineType: varchar("cuisine_type", { length: 100 }).notNull(),
  priceTier: integer("price_tier").notNull(),
  popularityScore: real("popularity_score").notNull().default(0),
  hours: text("hours").notNull(),
  managerAccessToken: uuid("manager_access_token").defaultRandom().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableNumber: integer("table_number").notNull(),
  capacity: integer("capacity").notNull(),
  shape: shapeEnum("shape").notNull(),
  xPos: real("x_pos").notNull(),
  yPos: real("y_pos").notNull(),
  rotation: real("rotation").notNull().default(0),
  status: tableStatusEnum("status").notNull().default("available"),
  statusUpdatedAt: timestamp("status_updated_at").defaultNow().notNull(),
  reservedUntil: timestamp("reserved_until"),
});

export const combinableTableGroups = pgTable("combinable_table_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  tableIds: uuid("table_ids").array().notNull(),
  combinedCapacity: integer("combined_capacity").notNull(),
});

export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  dinerName: varchar("diner_name", { length: 255 }).notNull(),
  dinerPhone: varchar("diner_phone", { length: 50 }).notNull(),
  partySize: integer("party_size").notNull(),
  startTime: timestamp("start_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  status: reservationStatusEnum("status").notNull().default("upcoming"),
  lookupCode: varchar("lookup_code", { length: 8 }).notNull(),
});

export const reservationTables = pgTable("reservation_tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  reservationId: uuid("reservation_id")
    .notNull()
    .references(() => reservations.id),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: varchar("name", { length: 255 }).notNull(),
  price: real("price").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
});

export const landmarkTypeEnum = pgEnum("landmark_type", [
  "entrance",
  "window",
  "restroom",
  "reception",
  "bar",
  "kitchen",
]);

export const landmarks = pgTable("landmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  type: landmarkTypeEnum("type").notNull(),
  xPos: real("x_pos").notNull(),
  yPos: real("y_pos").notNull(),
  label: varchar("label", { length: 100 }),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
});
