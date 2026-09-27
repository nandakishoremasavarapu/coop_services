import { db, client } from "../src/db";
import { ensureDatabaseReady } from "../src/db/init";
import { users } from "../src/db/schema";

async function main() {
  console.log("Initializing database...");
  await ensureDatabaseReady(client);
  const allUsers = await db.select().from(users);
  console.log(`[INIT-SUCCESS] Total users in database: ${allUsers.length}`);
  for (const u of allUsers.slice(0, 3)) {
    console.log(` - User ${u.phone} (${u.role})`);
  }
  if (client && typeof client.close === "function" && !client.closed) {
    try {
      await client.close();
    } catch {}
  }
  process.exit(0);
}

main().catch(async (err) => {
  console.error("[INIT-ERROR]", err);
  if (client && typeof client.close === "function" && !client.closed) {
    try {
      await client.close();
    } catch {}
  }
  process.exit(1);
});
