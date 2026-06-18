import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db/index.js";
import {
  restaurants, tables, menuItems, combinableTableGroups,
  landmarks, reservations, reservationTables,
} from "../db/schema.js";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getRestaurantByToken } from "../db/manager.js";
import { createReservation } from "../db/reservations.js";

const router = Router();

async function requireManager(req: Request, res: Response) {
  const token = req.params["token"] as string;
  const restaurant = await getRestaurantByToken(token);
  if (!restaurant) {
    res.status(401).json({ error: "Invalid manager token" });
    return null;
  }
  return restaurant;
}

// GET /:token/restaurant — full dashboard data
router.get("/:token/restaurant", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const now = new Date();
  const rid = restaurant.id;

  const [allTables, allMenu, allGroups, allLandmarks] = await Promise.all([
    db.select().from(tables).where(eq(tables.restaurantId, rid)),
    db.select().from(menuItems).where(eq(menuItems.restaurantId, rid)),
    db.select().from(combinableTableGroups).where(eq(combinableTableGroups.restaurantId, rid)),
    db.select().from(landmarks).where(eq(landmarks.restaurantId, rid)),
  ]);

  // Correct expired holds
  const correctedTables = allTables.map((t) => {
    if (t.status === "held" && t.reservedUntil && t.reservedUntil < now) {
      return { ...t, status: "available" as const, reservedUntil: null };
    }
    return t;
  });

  // Upcoming reservations (upcoming or seated, recent)
  const allReservations = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.restaurantId, rid),
        inArray(reservations.status, ["upcoming", "seated"])
      )
    )
    .orderBy(reservations.startTime);

  const upcomingWithTables = await Promise.all(
    allReservations.map(async (r) => {
      const linked = await db
        .select({ tableId: reservationTables.tableId, tableNumber: tables.tableNumber })
        .from(reservationTables)
        .innerJoin(tables, eq(tables.id, reservationTables.tableId))
        .where(eq(reservationTables.reservationId, r.id));
      return {
        id: r.id,
        dinerName: r.dinerName,
        dinerPhone: r.dinerPhone,
        partySize: r.partySize,
        startTime: r.startTime,
        durationMinutes: r.durationMinutes,
        status: r.status,
        lookupCode: r.lookupCode,
        tables: linked,
      };
    })
  );

  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      cuisineType: restaurant.cuisineType,
      priceTier: restaurant.priceTier,
      popularityScore: restaurant.popularityScore,
      hours: restaurant.hours,
      isActive: restaurant.isActive,
    },
    tables: correctedTables,
    menuItems: allMenu,
    combinableGroups: allGroups,
    landmarks: allLandmarks,
    upcomingReservations: upcomingWithTables,
  });
});

// POST /:token/tables/:tableId/status — manager table actions
router.post("/:token/tables/:tableId/status", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const { tableId } = req.params;
  const { action } = req.body as { action: string };
  const now = new Date();

  const [table] = await db.select().from(tables).where(
    and(eq(tables.id, tableId), eq(tables.restaurantId, restaurant.id))
  ).limit(1);

  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  // Correct expired hold
  const effectiveStatus = (table.status === "held" && table.reservedUntil && table.reservedUntil < now)
    ? "available" : table.status;

  switch (action) {
    case "mark_occupied": {
      if (effectiveStatus !== "available") {
        res.status(409).json({ error: "Table is not available" });
        return;
      }
      await db.update(tables).set({ status: "occupied", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, tableId));
      // Create walk-in reservation
      const [walkIn] = await db.insert(reservations).values({
        restaurantId: restaurant.id,
        dinerName: "Walk-in",
        dinerPhone: "",
        partySize: table.capacity,
        startTime: now,
        durationMinutes: 120,
        status: "seated",
        lookupCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      }).returning();
      await db.insert(reservationTables).values({ reservationId: walkIn!.id, tableId });
      res.json({ success: true });
      return;
    }
    case "seat": {
      if (effectiveStatus !== "held") {
        res.status(409).json({ error: "Table is not held" });
        return;
      }
      // Find linked reservation
      const linked = await findLinkedReservation(tableId, "upcoming");
      await db.update(tables).set({ status: "occupied", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, tableId));
      if (linked) {
        await db.update(reservations).set({ status: "seated" }).where(eq(reservations.id, linked.id));
        // Also update any other tables in this reservation
        const otherTables = await db.select({ tableId: reservationTables.tableId }).from(reservationTables).where(eq(reservationTables.reservationId, linked.id));
        for (const ot of otherTables) {
          if (ot.tableId !== tableId) {
            await db.update(tables).set({ status: "occupied", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, ot.tableId));
          }
        }
      }
      res.json({ success: true });
      return;
    }
    case "no_show": {
      if (effectiveStatus !== "held") {
        res.status(409).json({ error: "Table is not held" });
        return;
      }
      const linked = await findLinkedReservation(tableId, "upcoming");
      await db.update(tables).set({ status: "available", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, tableId));
      if (linked) {
        await db.update(reservations).set({ status: "no_show" }).where(eq(reservations.id, linked.id));
        const otherTables = await db.select({ tableId: reservationTables.tableId }).from(reservationTables).where(eq(reservationTables.reservationId, linked.id));
        for (const ot of otherTables) {
          if (ot.tableId !== tableId) {
            await db.update(tables).set({ status: "available", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, ot.tableId));
          }
        }
      }
      res.json({ success: true });
      return;
    }
    case "mark_available": {
      if (effectiveStatus !== "occupied") {
        res.status(409).json({ error: "Table is not occupied" });
        return;
      }
      await db.update(tables).set({ status: "available", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, tableId));
      const linked = await findLinkedReservation(tableId, "seated");
      if (linked) {
        await db.update(reservations).set({ status: "completed" }).where(eq(reservations.id, linked.id));
      }
      res.json({ success: true });
      return;
    }
    default:
      res.status(400).json({ error: "Invalid action" });
  }
});

// POST /:token/walk-in — combined walk-in using same code path as diner bookings
router.post("/:token/walk-in", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const { tableIds, partySize } = req.body as { tableIds: string[]; partySize?: number };
  if (!tableIds?.length) {
    res.status(400).json({ error: "tableIds required" });
    return;
  }

  const now = new Date();
  const result = await createReservation({
    restaurantId: restaurant.id,
    tableIds,
    dinerName: "Walk-in",
    dinerPhone: "",
    partySize: partySize || tableIds.length * 2,
    startTime: now,
    durationMinutes: 120,
    isLive: true,
  });

  if (!result.success) {
    res.status(409).json({ error: result.error });
    return;
  }

  // Transition from held to occupied + seated
  for (const tid of tableIds) {
    await db.update(tables).set({ status: "occupied", statusUpdatedAt: now, reservedUntil: null }).where(eq(tables.id, tid));
  }
  await db.update(reservations).set({ status: "seated" }).where(eq(reservations.id, result.reservationId));

  res.json({ success: true, reservationId: result.reservationId });
});

// PUT /:token/restaurant — update restaurant fields
router.put("/:token/restaurant", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const { name, address, cuisineType, priceTier, hours } = req.body as {
    name?: string; address?: string; cuisineType?: string; priceTier?: number; hours?: string;
  };

  await db.update(restaurants).set({
    ...(name && { name }),
    ...(address && { address }),
    ...(cuisineType && { cuisineType }),
    ...(priceTier && { priceTier }),
    ...(hours && { hours }),
  }).where(eq(restaurants.id, restaurant.id));

  res.json({ success: true });
});

// PUT /:token/tables — replace all tables
router.put("/:token/tables", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const newTables = req.body as Array<{
    tableNumber: number; capacity: number; shape: "circle" | "rectangle";
    xPos: number; yPos: number; rotation: number;
  }>;

  try {
    await db.delete(tables).where(eq(tables.restaurantId, restaurant.id));
    if (newTables.length) {
      await db.insert(tables).values(
        newTables.map((t) => ({
          restaurantId: restaurant.id,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          shape: t.shape,
          xPos: t.xPos,
          yPos: t.yPos,
          rotation: t.rotation || 0,
        }))
      );
    }
    res.json({ success: true });
  } catch {
    res.status(409).json({ error: "Cannot replace tables while active reservations reference them. Cancel or complete those reservations first." });
  }
});

// PUT /:token/menu — replace all menu items
router.put("/:token/menu", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const items = req.body as Array<{ name: string; price: number; category: string }>;
  await db.delete(menuItems).where(eq(menuItems.restaurantId, restaurant.id));
  if (items.length) {
    await db.insert(menuItems).values(items.map((m) => ({ restaurantId: restaurant.id, ...m })));
  }
  res.json({ success: true });
});

// PUT /:token/groups — replace combinable groups
router.put("/:token/groups", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const groups = req.body as Array<{ tableIds: string[]; combinedCapacity: number }>;
  await db.delete(combinableTableGroups).where(eq(combinableTableGroups.restaurantId, restaurant.id));
  if (groups.length) {
    await db.insert(combinableTableGroups).values(
      groups.map((g) => ({ restaurantId: restaurant.id, tableIds: g.tableIds, combinedCapacity: g.combinedCapacity }))
    );
  }
  res.json({ success: true });
});

// PUT /:token/landmarks — replace all landmarks
router.put("/:token/landmarks", async (req, res) => {
  const restaurant = await requireManager(req, res);
  if (!restaurant) return;

  const items = req.body as Array<{ type: "entrance" | "window" | "restroom" | "reception" | "bar" | "kitchen"; xPos: number; yPos: number; label?: string }>;
  await db.delete(landmarks).where(eq(landmarks.restaurantId, restaurant.id));
  if (items.length) {
    await db.insert(landmarks).values(items.map((l) => ({ restaurantId: restaurant.id, type: l.type, xPos: l.xPos, yPos: l.yPos, label: l.label || null })));
  }
  res.json({ success: true });
});

async function findLinkedReservation(tableId: string, status: "upcoming" | "seated" | "no_show" | "completed" | "cancelled") {
  const [link] = await db
    .select({ reservationId: reservationTables.reservationId })
    .from(reservationTables)
    .innerJoin(reservations, eq(reservations.id, reservationTables.reservationId))
    .where(and(eq(reservationTables.tableId, tableId), eq(reservations.status, status)))
    .limit(1);
  if (!link) return null;
  const [res] = await db.select().from(reservations).where(eq(reservations.id, link.reservationId)).limit(1);
  return res ?? null;
}

export default router;
