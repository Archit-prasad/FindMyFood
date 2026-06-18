import { Router } from "express";
import { db, sql as neonSql } from "../db/index.js";
import { reservations, reservationTables, tables, restaurants } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createReservation, cancelReservation } from "../db/reservations.js";

const router = Router();

router.post("/", async (req, res) => {
  const { restaurantId, tableIds, dinerName, dinerPhone, partySize, startTime, durationMinutes } = req.body as {
    restaurantId: string;
    tableIds: string[];
    dinerName: string;
    dinerPhone: string;
    partySize: number;
    startTime: string;
    durationMinutes: number;
  };

  if (!restaurantId || !tableIds?.length || !dinerName || !dinerPhone || !partySize || !startTime) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const start = new Date(startTime);
  const now = new Date();
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  const isLive = start <= fiveMinFromNow;

  const result = await createReservation({
    restaurantId,
    tableIds,
    dinerName,
    dinerPhone,
    partySize,
    startTime: start,
    durationMinutes: durationMinutes || 90,
    isLive,
  });

  if (!result.success) {
    res.status(409).json({ error: result.error });
    return;
  }

  res.status(201).json({ reservationId: result.reservationId, lookupCode: result.lookupCode });
});

router.get("/lookup/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();

  const [reservation] = await db
    .select({
      id: reservations.id,
      restaurantId: reservations.restaurantId,
      dinerName: reservations.dinerName,
      dinerPhone: reservations.dinerPhone,
      partySize: reservations.partySize,
      startTime: reservations.startTime,
      durationMinutes: reservations.durationMinutes,
      status: reservations.status,
      lookupCode: reservations.lookupCode,
    })
    .from(reservations)
    .where(eq(reservations.lookupCode, code))
    .limit(1);

  if (!reservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const [restaurant] = await db
    .select({ name: restaurants.name, address: restaurants.address })
    .from(restaurants)
    .where(eq(restaurants.id, reservation.restaurantId))
    .limit(1);

  const linkedTables = await db
    .select({
      tableId: reservationTables.tableId,
      tableNumber: tables.tableNumber,
      capacity: tables.capacity,
    })
    .from(reservationTables)
    .innerJoin(tables, eq(tables.id, reservationTables.tableId))
    .where(eq(reservationTables.reservationId, reservation.id));

  res.json({
    ...reservation,
    restaurantName: restaurant?.name ?? "Unknown",
    restaurantAddress: restaurant?.address ?? "",
    tables: linkedTables,
  });
});

router.post("/:id/cancel", async (req, res) => {
  const success = await cancelReservation(req.params.id);
  if (!success) {
    res.status(404).json({ error: "Reservation not found or already cancelled" });
    return;
  }
  res.json({ success: true });
});

export default router;
