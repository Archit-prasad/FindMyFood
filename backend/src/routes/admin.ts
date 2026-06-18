import { Router } from "express";
import { db, sql as neonSql } from "../db/index.js";
import { restaurants, tables, menuItems, combinableTableGroups, landmarks, reservations, reservationTables, reviews } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// List all restaurants (admin view — includes inactive)
router.get("/restaurants", async (_req, res) => {
  const all = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      cuisineType: restaurants.cuisineType,
      isActive: restaurants.isActive,
      managerAccessToken: restaurants.managerAccessToken,
    })
    .from(restaurants);
  res.json(all);
});

// Create restaurant
router.post("/restaurants", async (req, res) => {
  const body = req.body as {
    name: string;
    address: string;
    cuisineType: string;
    priceTier: number;
    hours: string;
    tables: Array<{ tableNumber: number; capacity: number; shape: "circle" | "rectangle"; xPos: number; yPos: number; rotation: number }>;
    menuItems: Array<{ name: string; price: number; category: string }>;
    combinableGroups: Array<{ tableIndices: number[]; combinedCapacity: number }>;
    landmarks: Array<{ type: "entrance" | "window" | "restroom" | "reception" | "bar" | "kitchen"; xPos: number; yPos: number; label?: string }>;
  };

  if (!body.name || !body.address || !body.cuisineType || !body.hours) {
    res.status(400).json({ error: "Missing required restaurant fields" });
    return;
  }

  const [restaurant] = await db
    .insert(restaurants)
    .values({
      name: body.name,
      address: body.address,
      cuisineType: body.cuisineType,
      priceTier: body.priceTier || 2,
      hours: body.hours,
    })
    .returning();

  const rid = restaurant!.id;

  let insertedTables: Array<{ id: string }> = [];
  if (body.tables?.length) {
    insertedTables = await db
      .insert(tables)
      .values(
        body.tables.map((t) => ({
          restaurantId: rid,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          shape: t.shape,
          xPos: t.xPos,
          yPos: t.yPos,
          rotation: t.rotation || 0,
        }))
      )
      .returning({ id: tables.id });
  }

  if (body.menuItems?.length) {
    await db.insert(menuItems).values(
      body.menuItems.map((m) => ({
        restaurantId: rid,
        name: m.name,
        price: m.price,
        category: m.category,
      }))
    );
  }

  if (body.combinableGroups?.length && insertedTables.length) {
    await db.insert(combinableTableGroups).values(
      body.combinableGroups.map((g) => ({
        restaurantId: rid,
        tableIds: g.tableIndices.map((i) => insertedTables[i]!.id),
        combinedCapacity: g.combinedCapacity,
      }))
    );
  }

  if (body.landmarks?.length) {
    await db.insert(landmarks).values(
      body.landmarks.map((l) => ({
        restaurantId: rid,
        type: l.type,
        xPos: l.xPos,
        yPos: l.yPos,
        label: l.label || null,
      }))
    );
  }

  res.status(201).json({
    restaurantId: rid,
    managerAccessToken: restaurant!.managerAccessToken,
  });
});

// Toggle active/inactive
router.patch("/restaurants/:id/active", async (req, res) => {
  const { isActive } = req.body as { isActive: boolean };
  if (typeof isActive !== "boolean") {
    res.status(400).json({ error: "isActive must be a boolean" });
    return;
  }

  const [updated] = await db
    .update(restaurants)
    .set({ isActive })
    .where(eq(restaurants.id, req.params.id as string))
    .returning({ id: restaurants.id });

  if (!updated) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  res.json({ success: true });
});

// Delete restaurant with full cascade in a transaction
router.delete("/restaurants/:id", async (req, res) => {
  const rid = req.params.id as string;

  // Verify restaurant exists
  const [existing] = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.id, rid)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  try {
    await neonSql.transaction([
      // 1. reservation_tables (depends on both reservations and tables)
      neonSql`DELETE FROM reservation_tables WHERE reservation_id IN (SELECT id FROM reservations WHERE restaurant_id = ${rid}::uuid)`,
      // 2. reservations
      neonSql`DELETE FROM reservations WHERE restaurant_id = ${rid}::uuid`,
      // 3. combinable_table_groups
      neonSql`DELETE FROM combinable_table_groups WHERE restaurant_id = ${rid}::uuid`,
      // 4. tables
      neonSql`DELETE FROM tables WHERE restaurant_id = ${rid}::uuid`,
      // 5. menu_items
      neonSql`DELETE FROM menu_items WHERE restaurant_id = ${rid}::uuid`,
      // 6. reviews
      neonSql`DELETE FROM reviews WHERE restaurant_id = ${rid}::uuid`,
      // 7. landmarks
      neonSql`DELETE FROM landmarks WHERE restaurant_id = ${rid}::uuid`,
      // 8. restaurant
      neonSql`DELETE FROM restaurants WHERE id = ${rid}::uuid`,
    ]);

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete restaurant" });
  }
});

export default router;
