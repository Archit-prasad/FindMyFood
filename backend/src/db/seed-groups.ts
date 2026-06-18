import "dotenv/config";
import { db } from "./index.js";
import { tables, combinableTableGroups } from "./schema.js";

async function main() {
  const allTables = await db.select({ id: tables.id, restaurantId: tables.restaurantId, tableNumber: tables.tableNumber }).from(tables);
  const groups = await db.select().from(combinableTableGroups);

  if (groups.length > 0) {
    console.log("Already have", groups.length, "combinable groups:");
    groups.forEach((g) => console.log("  tables:", g.tableIds, "cap:", g.combinedCapacity));
    return;
  }

  const bistroId = allTables.find((t) => t.tableNumber === 1 && allTables.filter((x) => x.restaurantId === t.restaurantId).length === 6)!.restaurantId;
  const b1 = allTables.find((t) => t.restaurantId === bistroId && t.tableNumber === 1)!;
  const b2 = allTables.find((t) => t.restaurantId === bistroId && t.tableNumber === 2)!;

  const gardenId = allTables.find((t) => t.tableNumber === 1 && allTables.filter((x) => x.restaurantId === t.restaurantId).length === 5)!.restaurantId;
  const g1 = allTables.find((t) => t.restaurantId === gardenId && t.tableNumber === 1)!;
  const g2 = allTables.find((t) => t.restaurantId === gardenId && t.tableNumber === 2)!;

  const result = await db.insert(combinableTableGroups).values([
    { restaurantId: bistroId, tableIds: [b1.id, b2.id], combinedCapacity: 4 },
    { restaurantId: gardenId, tableIds: [g1.id, g2.id], combinedCapacity: 4 },
  ]).returning();

  console.log("Inserted", result.length, "combinable groups:");
  result.forEach((g) => console.log("  tables:", g.tableIds, "cap:", g.combinedCapacity));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
