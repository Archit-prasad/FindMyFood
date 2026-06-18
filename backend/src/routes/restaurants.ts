import { Router } from "express";
import { db, sql as neonSql } from "../db/index.js";
import { restaurants, tables, menuItems, reviews, combinableTableGroups, reservationTables, reservations, landmarks } from "../db/schema.js";
import { eq, and, avg, count, desc } from "drizzle-orm";
import { holdTables } from "../db/hold.js";

const router = Router();

router.get("/", async (_req, res) => {
  const all = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      cuisineType: restaurants.cuisineType,
      priceTier: restaurants.priceTier,
      popularityScore: restaurants.popularityScore,
      hours: restaurants.hours,
    })
    .from(restaurants)
    .where(eq(restaurants.isActive, true));

  const now = new Date();
  const withAvailability = await Promise.all(
    all.map(async (r) => {
      const rTables = await db.select().from(tables).where(eq(tables.restaurantId, r.id));
      const availableCount = rTables.filter((t) => {
        if (t.status === "available") return true;
        if (t.status === "held" && t.reservedUntil && t.reservedUntil < now) return true;
        return false;
      }).length;
      return { ...r, availableTableCount: availableCount, totalTableCount: rTables.length };
    })
  );

  res.json(withAvailability);
});

router.get("/:id", async (req, res) => {
  const [restaurant] = await db
    .select({
      id: restaurants.id,
      name: restaurants.name,
      address: restaurants.address,
      cuisineType: restaurants.cuisineType,
      priceTier: restaurants.priceTier,
      popularityScore: restaurants.popularityScore,
      hours: restaurants.hours,
    })
    .from(restaurants)
    .where(and(eq(restaurants.id, req.params.id), eq(restaurants.isActive, true)))
    .limit(1);

  if (!restaurant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json(restaurant);
});

router.get("/:id/tables", async (req, res) => {
  const { date, time } = req.query as { date?: string; time?: string };
  const now = new Date();

  const allTables = await db
    .select()
    .from(tables)
    .where(eq(tables.restaurantId, req.params.id));

  const isToday = !date || isSameDay(new Date(date), now);
  const isFuture = !isToday;

  if (isFuture && date) {
    const queryTime = time || "19:00";
    const startTime = new Date(`${date}T${queryTime}:00`);
    const durationMinutes = 90;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const reservedTableIds = await getReservedTableIds(
      allTables.map((t) => t.id),
      startTime,
      endTime
    );

    const withFutureStatus = allTables.map((t) => ({
      ...t,
      status: reservedTableIds.has(t.id) ? ("reserved" as const) : ("available" as const),
      reservedUntil: null,
    }));

    res.json(withFutureStatus);
    return;
  }

  // Live/today: use existing status with expired-hold correction
  const withLiveStatus = allTables.map((t) => {
    if (t.status === "held" && t.reservedUntil && t.reservedUntil < now) {
      return { ...t, status: "available" as const, reservedUntil: null };
    }
    return t;
  });

  res.json(withLiveStatus);
});

router.post("/:id/tables/:tableId/hold", async (req, res) => {
  const result = await holdTables([req.params.tableId]);

  if (!result.success) {
    res.status(409).json({ error: "Table is not available" });
    return;
  }

  res.json({ success: true, tableId: result.heldIds[0], heldUntil: result.heldUntil });
});

router.get("/:id/menu", async (req, res) => {
  const items = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, req.params.id));
  res.json(items);
});

router.get("/:id/reviews", async (req, res) => {
  const allReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.restaurantId, req.params.id))
    .orderBy(desc(reviews.id));

  const total = allReviews.length;
  const avgRating = total > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;

  res.json({ reviews: allReviews, avgRating: Math.round(avgRating * 10) / 10, count: total });
});

router.post("/:id/reviews", async (req, res) => {
  const { rating, comment } = req.body as { rating: number; comment?: string };
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const [review] = await db
    .insert(reviews)
    .values({
      restaurantId: req.params.id,
      rating,
      comment: comment || null,
    })
    .returning();

  res.status(201).json(review);
});

router.get("/:id/landmarks", async (req, res) => {
  const items = await db
    .select()
    .from(landmarks)
    .where(eq(landmarks.restaurantId, req.params.id));
  res.json(items);
});

router.get("/:id/combinable-groups", async (req, res) => {
  const groups = await db
    .select()
    .from(combinableTableGroups)
    .where(eq(combinableTableGroups.restaurantId, req.params.id));
  res.json(groups);
});

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function getReservedTableIds(
  tableIds: string[],
  startTime: Date,
  endTime: Date
): Promise<Set<string>> {
  if (tableIds.length === 0) return new Set();

  const startIso = startTime.toISOString();
  const endIso = endTime.toISOString();

  const result = await neonSql`
    SELECT DISTINCT rt.table_id
    FROM reservation_tables rt
    JOIN reservations r ON r.id = rt.reservation_id
    WHERE rt.table_id = ANY(${tableIds}::uuid[])
      AND r.status NOT IN ('cancelled', 'completed', 'no_show')
      AND r.start_time < ${endIso}::timestamptz
      AND (r.start_time + (r.duration_minutes || ' minutes')::interval) > ${startIso}::timestamptz
  `;

  return new Set(result.map((row: any) => row.table_id as string));
}

export default router;
