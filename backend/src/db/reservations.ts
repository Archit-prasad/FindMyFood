import crypto from "node:crypto";
import { sql, db } from "./index.js";
import { reservations, reservationTables, tables } from "./schema.js";
import { eq } from "drizzle-orm";
import { holdTables } from "./hold.js";

export function generateLookupCode(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0);
  return num.toString(36).toUpperCase().slice(0, 6).padEnd(6, "0");
}

interface CreateReservationParams {
  restaurantId: string;
  tableIds: string[];
  dinerName: string;
  dinerPhone: string;
  partySize: number;
  startTime: Date;
  durationMinutes: number;
  isLive: boolean;
}

export async function createReservation(
  params: CreateReservationParams
): Promise<{ success: true; reservationId: string; lookupCode: string } | { success: false; error: string }> {
  const { restaurantId, tableIds, dinerName, dinerPhone, partySize, startTime, durationMinutes, isLive } = params;
  const lookupCode = generateLookupCode();
  const startIso = startTime.toISOString();
  const durInterval = `${durationMinutes} minutes`;

  if (isLive) {
    const holdResult = await holdTables(tableIds);
    if (!holdResult.success) {
      return { success: false, error: "One or more tables are not available" };
    }

    const insertRes = sql`INSERT INTO reservations (id, restaurant_id, diner_name, diner_phone, party_size, start_time, duration_minutes, status, lookup_code)
      VALUES (gen_random_uuid(), ${restaurantId}::uuid, ${dinerName}, ${dinerPhone}, ${partySize}::int, ${startIso}::timestamptz, ${durationMinutes}::int, 'upcoming', ${lookupCode})
      RETURNING id`;

    const rtInserts = tableIds.map(
      (tid) =>
        sql`INSERT INTO reservation_tables (id, reservation_id, table_id)
            VALUES (gen_random_uuid(), (SELECT id FROM reservations WHERE lookup_code = ${lookupCode} LIMIT 1), ${tid}::uuid)`
    );

    try {
      const results = await sql.transaction([insertRes, ...rtInserts]);
      const resId = (results[0] as any)[0]?.id as string;
      return { success: true, reservationId: resId, lookupCode };
    } catch {
      return { success: false, error: "Failed to create reservation" };
    }
  }

  // Future booking: atomically check overlaps then insert
  const overlapAssertions = tableIds.map(
    (tid) =>
      sql`SELECT 1 / CASE
        WHEN (
          SELECT count(*) FROM reservation_tables rt
          JOIN reservations r ON r.id = rt.reservation_id
          WHERE rt.table_id = ${tid}::uuid
            AND r.status NOT IN ('cancelled', 'completed', 'no_show')
            AND r.start_time < (${startIso}::timestamptz + ${durInterval}::interval)
            AND (r.start_time + (r.duration_minutes || ' minutes')::interval) > ${startIso}::timestamptz
        ) = 0 THEN 1
        ELSE 0
      END as ok`
  );

  const insertRes = sql`INSERT INTO reservations (id, restaurant_id, diner_name, diner_phone, party_size, start_time, duration_minutes, status, lookup_code)
    VALUES (gen_random_uuid(), ${restaurantId}::uuid, ${dinerName}, ${dinerPhone}, ${partySize}::int, ${startIso}::timestamptz, ${durationMinutes}::int, 'upcoming', ${lookupCode})
    RETURNING id`;

  const rtInserts = tableIds.map(
    (tid) =>
      sql`INSERT INTO reservation_tables (id, reservation_id, table_id)
          VALUES (gen_random_uuid(), (SELECT id FROM reservations WHERE lookup_code = ${lookupCode} LIMIT 1), ${tid}::uuid)`
  );

  try {
    const results = await sql.transaction([...overlapAssertions, insertRes, ...rtInserts]);
    const resIdx = overlapAssertions.length;
    const resId = (results[resIdx] as any)[0]?.id as string;
    return { success: true, reservationId: resId, lookupCode };
  } catch {
    return { success: false, error: "Time conflict: one or more tables already reserved for this time" };
  }
}

export async function cancelReservation(reservationId: string): Promise<boolean> {
  const [reservation] = await db
    .select({
      id: reservations.id,
      status: reservations.status,
      startTime: reservations.startTime,
    })
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);

  if (!reservation || reservation.status === "cancelled") return false;

  await db
    .update(reservations)
    .set({ status: "cancelled" })
    .where(eq(reservations.id, reservationId));

  // For live bookings (start_time within the next few minutes or in the past),
  // release the physical tables back to available
  const now = new Date();
  const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  if (reservation.startTime <= fiveMinFromNow) {
    const linkedTables = await db
      .select({ tableId: reservationTables.tableId })
      .from(reservationTables)
      .where(eq(reservationTables.reservationId, reservationId));

    for (const lt of linkedTables) {
      await db
        .update(tables)
        .set({ status: "available", reservedUntil: null, statusUpdatedAt: now })
        .where(eq(tables.id, lt.tableId));
    }
  }

  return true;
}
