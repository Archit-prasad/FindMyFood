import "dotenv/config";
import { db } from "./index.js";
import { tables } from "./schema.js";
import { eq } from "drizzle-orm";
import { holdTables } from "./hold.js";

async function attemptHold(tableIds: string[], label: string) {
  const result = await holdTables(tableIds);
  if (result.success) {
    console.log(`[${label}] SUCCESS — held ${result.heldIds.length} table(s)`);
    return true;
  }
  console.log(`[${label}] FAILED — could not hold`);
  return false;
}

async function resetTable(id: string) {
  await db
    .update(tables)
    .set({ status: "available", reservedUntil: null })
    .where(eq(tables.id, id));
}

async function getTableStatus(id: string) {
  const [t] = await db
    .select({ status: tables.status, reservedUntil: tables.reservedUntil })
    .from(tables)
    .where(eq(tables.id, id));
  return t!;
}

async function main() {
  const allTables = await db
    .select({ id: tables.id, tableNumber: tables.tableNumber, restaurantId: tables.restaurantId })
    .from(tables)
    .limit(3);

  if (allTables.length < 3) {
    console.error("Need at least 3 tables. Run `npm run db:seed` first.");
    process.exit(1);
  }

  const [tA, tB, tC] = allTables as [typeof allTables[0] & {}, typeof allTables[0] & {}, typeof allTables[0] & {}];

  // --- Test 1: Two concurrent holds on an available table ---
  console.log("=== Test 1: Concurrent Hold (race condition) ===\n");
  console.log(`Target: table #${tA.tableNumber} (${tA.id})\n`);

  await resetTable(tA.id);

  console.log("Launching two concurrent hold attempts...\n");

  const [r1, r2] = await Promise.all([
    attemptHold([tA.id], "Attempt 1"),
    attemptHold([tA.id], "Attempt 2"),
  ]);

  console.log("");
  const successes = [r1, r2].filter(Boolean).length;
  if (successes === 1) {
    console.log("PASS: Exactly one attempt succeeded, one failed.\n");
  } else {
    console.log(`FAIL: ${successes} attempts succeeded (expected exactly 1).`);
    process.exit(1);
  }

  // --- Test 2: Expired hold can be re-claimed ---
  console.log("=== Test 2: Expired Hold Recovery ===\n");

  const expiredTime = new Date(Date.now() - 60 * 1000);
  await db
    .update(tables)
    .set({ status: "held", reservedUntil: expiredTime, statusUpdatedAt: new Date() })
    .where(eq(tables.id, tA.id));

  console.log(`Table set to held with reserved_until = ${expiredTime.toISOString()} (in the past)\n`);

  const r3 = await attemptHold([tA.id], "Re-claim expired");

  console.log("");
  if (r3) {
    console.log("PASS: Expired hold was successfully re-claimed.\n");
  } else {
    console.log("FAIL: Expired hold could not be re-claimed.");
    process.exit(1);
  }

  // --- Test 3: Active hold CANNOT be stolen ---
  console.log("=== Test 3: Active Hold Rejected ===\n");

  const r4 = await attemptHold([tA.id], "Steal active");

  console.log("");
  if (!r4) {
    console.log("PASS: Active hold correctly rejected.\n");
  } else {
    console.log("FAIL: Active hold was stolen.");
    process.exit(1);
  }

  // --- Test 4: Multi-table atomicity (partial failure → full rollback) ---
  console.log("=== Test 4: Multi-Table Atomic Rollback ===\n");

  // Reset A and B to available, set C to actively held (not expired)
  await resetTable(tA.id);
  await resetTable(tB.id);
  await db
    .update(tables)
    .set({
      status: "held",
      reservedUntil: new Date(Date.now() + 10 * 60 * 1000),
      statusUpdatedAt: new Date(),
    })
    .where(eq(tables.id, tC.id));

  console.log(`Table A (#${tA.tableNumber}): available`);
  console.log(`Table B (#${tB.tableNumber}): available`);
  console.log(`Table C (#${tC.tableNumber}): actively held (not expired)\n`);

  console.log("Attempting holdTables([A, B, C]) — should fail because C is held...\n");

  const r5 = await attemptHold([tA.id, tB.id, tC.id], "Hold A+B+C");

  console.log("");
  if (r5) {
    console.log("FAIL: Multi-table hold should have failed (C is held).");
    process.exit(1);
  }

  // Now verify A and B are still available — NOT orphaned as held
  const statusA = await getTableStatus(tA.id);
  const statusB = await getTableStatus(tB.id);

  console.log(`After failed multi-hold:`);
  console.log(`  Table A status: ${statusA.status}`);
  console.log(`  Table B status: ${statusB.status}\n`);

  if (statusA.status === "available" && statusB.status === "available") {
    console.log("PASS: A and B were never held — transaction rolled back atomically.\n");
  } else {
    console.log("FAIL: A or B is stuck as held — orphaned state, rollback did not work.");
    process.exit(1);
  }

  // Cleanup
  await resetTable(tA.id);
  await resetTable(tB.id);
  await resetTable(tC.id);

  console.log("=== All 4 tests passed. ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
