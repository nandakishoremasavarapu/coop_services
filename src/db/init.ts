import fs from "fs";
import path from "path";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureDatabaseReady(client?: PGlite | any, forceRecover = false) {
  if (isInitialized && !forceRecover) return;
  if (initPromise && !forceRecover) return initPromise;

  initPromise = (async () => {
    try {
      console.log("[DB] Verifying database schema and initial state...");

      let activeClient = client || (globalThis as any).__coopClient;
      let needsRecovery = forceRecover;

      if (!needsRecovery && activeClient && typeof activeClient.waitReady !== "undefined") {
        try {
          await activeClient.waitReady;
          await activeClient.query("SELECT 1;");
        } catch (readyErr: any) {
          console.warn("[DB] PGlite waitReady / test query error:", readyErr?.message || readyErr);
          needsRecovery = true;
        }
      }

      if (needsRecovery && typeof activeClient?.exec === "function") {
        console.log("[DB] Initiating PGlite recovery from disk corruption...");
        const { getPgliteDataDir, recoverPgliteInstance } = await import("./index");
        activeClient = await recoverPgliteInstance(getPgliteDataDir());
        (globalThis as any).__coopClient = activeClient;
      }

      // Check if tables exist
      let checkRes;
      try {
        checkRes = await activeClient.query(
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users';"
        );
      } catch (queryErr: any) {
        const msg = String(queryErr?.message || queryErr);
        if (
          msg.includes("Aborted") ||
          msg.includes("checkpoint") ||
          msg.includes("PANIC") ||
          msg.includes("failed to initialize")
        ) {
          console.warn("[DB] Database was interrupted or corrupted during table check. Recovering storage...");
          const { getPgliteDataDir, recoverPgliteInstance } = await import("./index");
          activeClient = await recoverPgliteInstance(getPgliteDataDir());
          (globalThis as any).__coopClient = activeClient;
          checkRes = { rows: [] };
        } else {
          throw queryErr;
        }
      }

      const tablesExist = checkRes?.rows && checkRes.rows.length > 0;

      if (!tablesExist) {
        console.log("[DB] Tables not found. Applying database schema from migration...");
        const migrationPath = path.resolve(process.cwd(), "drizzle", "0000_easy_stryfe.sql");
        if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, "utf-8");
          if (typeof activeClient.exec === "function") {
            await activeClient.exec(sql);
          } else {
            const statements = sql.split("--> statement-breakpoint");
            for (const stmt of statements) {
              const trimmed = stmt.trim();
              if (trimmed) {
                try {
                  await activeClient.query(trimmed);
                } catch (err: any) {
                  if (!err.message?.includes("already exists")) {
                    console.warn("[DB Migration Warning]:", err.message);
                  }
                }
              }
            }
          }
          console.log("[DB] Migration completed successfully!");
        }
      }

      // Check if users exist for seeding
      const userCountRes = await activeClient.query("SELECT COUNT(*) as count FROM users;");
      const count = parseInt(userCountRes.rows[0]?.count ?? "0", 10);

      if (count === 0) {
        console.log("[DB] Database is empty. Seeding initial data (demo users, services, categories)...");
        const { seedDatabase } = await import("./seed");
        const seedDb = typeof activeClient.exec === "function" ? drizzlePglite(activeClient) : drizzlePg(activeClient);
        await seedDatabase(seedDb);
        console.log("[DB] Seeding completed successfully!");
      } else {
        console.log(`[DB] Database is ready with ${count} existing users.`);
      }

      isInitialized = true;
    } catch (error) {
      console.error("[DB] Error ensuring database readiness:", error);
      throw error;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

