import { db } from "./index.js";
import { restaurants } from "./schema.js";
import { eq } from "drizzle-orm";

export async function getRestaurantByToken(token: string) {
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.managerAccessToken, token))
    .limit(1);
  return restaurant ?? null;
}
