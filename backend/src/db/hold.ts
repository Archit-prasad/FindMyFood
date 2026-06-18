import { sql } from "./index.js";

export async function holdTables(
  tableIds: string[]
): Promise<{ success: true; heldIds: string[]; heldUntil: Date } | { success: false }> {
  const heldUntil = new Date(Date.now() + 5 * 60 * 1000);

  // Build one UPDATE per table, all executed inside a single BEGIN/COMMIT.
  // If any UPDATE affects 0 rows we detect it after the transaction and
  // the caller treats it as a failure — but crucially, the SUCCESSful
  // updates also get rolled back because we force a failure inside the
  // transaction (see the check query at the end).
  //
  // Strategy: run all UPDATEs with RETURNING, then a final assertion query
  // that raises an error if any UPDATE returned 0 rows. Neon's HTTP
  // transaction rolls back the entire batch on any error.

  const updates = tableIds.map(
    (id) =>
      sql`UPDATE tables
          SET status = 'held',
              status_updated_at = NOW(),
              reserved_until = ${heldUntil.toISOString()}::timestamptz
          WHERE id = ${id}::uuid
            AND (status = 'available'
                 OR (status = 'held' AND reserved_until < NOW()))
          RETURNING id`
  );

  // Assertion query: counts how many tables we just held, and raises
  // an error (division by zero) if the count doesn't match the expected
  // number. This forces a ROLLBACK of the entire transaction.
  const expected = tableIds.length;
  const assertAll = sql`SELECT (
    SELECT 1 / CASE
      WHEN (${expected}::int) = (
        SELECT count(*) FROM tables
        WHERE id = ANY(${tableIds}::uuid[])
          AND status = 'held'
          AND reserved_until = ${heldUntil.toISOString()}::timestamptz
      ) THEN 1
      ELSE 0
    END
  ) as ok`;

  try {
    const results = await sql.transaction([...updates, assertAll]);
    // All succeeded — collect held IDs from the UPDATE results
    const heldIds = results
      .slice(0, tableIds.length)
      .flat()
      .map((row: any) => row.id as string);
    return { success: true, heldIds, heldUntil };
  } catch {
    return { success: false };
  }
}
