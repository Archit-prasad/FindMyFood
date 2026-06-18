import "dotenv/config";
import { db } from "./index.js";
import { restaurants, tables, menuItems, combinableTableGroups } from "./schema.js";

async function seed() {
  console.log("Seeding database...");

  const [bistro] = await db
    .insert(restaurants)
    .values({
      name: "The Golden Bistro",
      address: "123 Main Street, Downtown",
      cuisineType: "Italian",
      priceTier: 3,
      popularityScore: 4.5,
      hours: "11:00-22:00",
    })
    .returning();

  const [garden] = await db
    .insert(restaurants)
    .values({
      name: "Sakura Garden",
      address: "456 Oak Avenue, Midtown",
      cuisineType: "Japanese",
      priceTier: 2,
      popularityScore: 4.2,
      hours: "12:00-23:00",
    })
    .returning();

  const bistroTables = await db.insert(tables).values([
    { restaurantId: bistro!.id, tableNumber: 1, capacity: 2, shape: "circle" as const, xPos: 15, yPos: 20, rotation: 0 },
    { restaurantId: bistro!.id, tableNumber: 2, capacity: 2, shape: "circle" as const, xPos: 35, yPos: 20, rotation: 0 },
    { restaurantId: bistro!.id, tableNumber: 3, capacity: 4, shape: "rectangle" as const, xPos: 60, yPos: 20, rotation: 0 },
    { restaurantId: bistro!.id, tableNumber: 4, capacity: 4, shape: "rectangle" as const, xPos: 15, yPos: 55, rotation: 0 },
    { restaurantId: bistro!.id, tableNumber: 5, capacity: 6, shape: "rectangle" as const, xPos: 55, yPos: 55, rotation: 45 },
    { restaurantId: bistro!.id, tableNumber: 6, capacity: 8, shape: "rectangle" as const, xPos: 40, yPos: 80, rotation: 0 },
  ]).returning();

  const gardenTables = await db.insert(tables).values([
    { restaurantId: garden!.id, tableNumber: 1, capacity: 2, shape: "circle" as const, xPos: 20, yPos: 25, rotation: 0 },
    { restaurantId: garden!.id, tableNumber: 2, capacity: 2, shape: "circle" as const, xPos: 50, yPos: 25, rotation: 0 },
    { restaurantId: garden!.id, tableNumber: 3, capacity: 4, shape: "rectangle" as const, xPos: 80, yPos: 25, rotation: 0 },
    { restaurantId: garden!.id, tableNumber: 4, capacity: 4, shape: "rectangle" as const, xPos: 20, yPos: 60, rotation: 90 },
    { restaurantId: garden!.id, tableNumber: 5, capacity: 6, shape: "rectangle" as const, xPos: 60, yPos: 60, rotation: 0 },
  ]).returning();

  // Bistro: Tables 1+2 (adjacent 2-seat circles) combine to seat 4
  await db.insert(combinableTableGroups).values([
    {
      restaurantId: bistro!.id,
      tableIds: [bistroTables[0]!.id, bistroTables[1]!.id],
      combinedCapacity: 4,
    },
    // Garden: Tables 1+2 (adjacent 2-seat circles) combine to seat 4
    {
      restaurantId: garden!.id,
      tableIds: [gardenTables[0]!.id, gardenTables[1]!.id],
      combinedCapacity: 4,
    },
  ]);

  await db.insert(menuItems).values([
    { restaurantId: bistro!.id, name: "Margherita Pizza", price: 14.99, category: "Mains" },
    { restaurantId: bistro!.id, name: "Pasta Carbonara", price: 16.99, category: "Mains" },
    { restaurantId: bistro!.id, name: "Tiramisu", price: 8.99, category: "Desserts" },
    { restaurantId: garden!.id, name: "Salmon Sashimi", price: 18.99, category: "Sashimi" },
    { restaurantId: garden!.id, name: "Chicken Teriyaki", price: 15.99, category: "Mains" },
    { restaurantId: garden!.id, name: "Mochi Ice Cream", price: 6.99, category: "Desserts" },
  ]);

  console.log("Seeding complete.");
  console.log(`  The Golden Bistro (manager token: ${bistro!.managerAccessToken})`);
  console.log(`  Sakura Garden (manager token: ${garden!.managerAccessToken})`);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
