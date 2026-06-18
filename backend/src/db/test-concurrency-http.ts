import "dotenv/config";
import { db } from "./index.js";
import { tables } from "./schema.js";
import { eq } from "drizzle-orm";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== HTTP-Level Concurrency Test ===\n");

  // Get a restaurant and table
  const restaurants = await fetch(`${BASE}/api/restaurants`).then((r) => r.json()) as any[];
  const rid = restaurants[0].id;
  const allTables = await fetch(`${BASE}/api/restaurants/${rid}/tables`).then((r) => r.json()) as any[];
  const target = allTables.find((t: any) => t.status === "available");
  if (!target) {
    console.error("No available table found. Free one up first.");
    process.exit(1);
  }

  console.log(`Target: Table #${target.tableNumber} (${target.id})\n`);

  const successes: string[] = [];
  const failures: string[] = [];

  console.log("Firing 5 simultaneous booking requests...\n");

  const now = new Date().toISOString();
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map(async (i) => {
      const res = await fetch(`${BASE}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: rid,
          tableIds: [target.id],
          dinerName: `Racer ${i}`,
          dinerPhone: `${i}${i}${i}`,
          partySize: 2,
          startTime: now,
          durationMinutes: 60,
        }),
      });
      const body = await res.json();
      return { i, status: res.status, body };
    })
  );

  for (const r of results) {
    if (r.status === 201) {
      successes.push(`Racer ${r.i}`);
      console.log(`  [Racer ${r.i}] SUCCESS (${r.status}) — code: ${r.body.lookupCode}`);
    } else {
      failures.push(`Racer ${r.i}`);
      console.log(`  [Racer ${r.i}] REJECTED (${r.status}) — ${r.body.error}`);
    }
  }

  console.log(`\nResults: ${successes.length} succeeded, ${failures.length} rejected`);
  if (successes.length === 1) {
    console.log("PASS: Exactly one booking succeeded out of 5 simultaneous attempts.");
  } else {
    console.log(`FAIL: Expected exactly 1 success, got ${successes.length}.`);
    process.exit(1);
  }

  // Clean up — cancel the winning reservation
  const winner = results.find((r) => r.status === 201)!;
  await fetch(`${BASE}/api/reservations/${winner.body.reservationId}/cancel`, { method: "POST" });
  console.log("\nCleaned up: cancelled the winning reservation.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
