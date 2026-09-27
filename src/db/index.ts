import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import path from "path";
import fs from "fs";
import { ensureDatabaseReady } from "./init";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

// Use PGlite if explicitly enabled or if using default local URL without custom USE_PGLITE=false
const isLocalhost =
  databaseUrl.includes("127.0.0.1:5432") ||
  databaseUrl.includes("localhost:5432");
const usePglite =
  process.env.USE_PGLITE === "true" ||
  (isLocalhost && process.env.USE_PGLITE !== "false");

const globalForDb = globalThis as typeof globalThis & {
  __coopDb?: any;
  __coopClient?: any;
  __coopPool?: Pool;
  __coopInitPromise?: Promise<void>;
  __coopIsReady?: boolean;
  __coopCleanupRegistered?: boolean;
};

export function removeStalePid(dataDir: string) {
  try {
    const pidFile = path.join(dataDir, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch {}
}

export function getPgliteDataDir(): string {
  const baseDir = process.env.LOCALAPPDATA || process.cwd();
  return path.join(baseDir, "coop_service_pgdata");
}

export async function recoverPgliteInstance(dataDir: string): Promise<PGlite> {
  console.log("[DB] Performing automated database recovery for:", dataDir);
  try {
    if (
      globalForDb.__coopClient &&
      typeof globalForDb.__coopClient.close === "function" &&
      !globalForDb.__coopClient.closed
    ) {
      await globalForDb.__coopClient.close();
    }
  } catch {}

  try {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.mkdirSync(dataDir, { recursive: true });
    const fresh = new PGlite(dataDir, { relaxedDurability: true });
    await fresh.waitReady;
    await fresh.query("SELECT 1;");
    globalForDb.__coopClient = fresh;
    console.log("[DB] Fresh PGlite storage created and ready.");
    return fresh;
  } catch (err: any) {
    console.warn("[DB] Failed to recreate on disk, falling back to memory:", err?.message || err);
    const mem = new PGlite({ relaxedDurability: true });
    await mem.waitReady;
    globalForDb.__coopClient = mem;
    return mem;
  }
}

let db: any;
let client: any;

if (usePglite) {
  if (!globalForDb.__coopDb) {
    const pglitePath = getPgliteDataDir();
    fs.mkdirSync(pglitePath, { recursive: true });
    removeStalePid(pglitePath);

    // Instantiate with relaxedDurability: true to prevent WAL corruption on sudden process exit
    client = new PGlite(pglitePath, { relaxedDurability: true });
    globalForDb.__coopClient = client;

    // Create a self-healing proxy client for Drizzle that awaits database readiness
    // and recovers automatically if PGlite ever aborts
    const clientProxy = new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === "query" || prop === "exec" || prop === "transaction") {
          return async (...args: any[]) => {
            if (!globalForDb.__coopIsReady && globalForDb.__coopInitPromise) {
              try {
                await globalForDb.__coopInitPromise;
              } catch {}
            }
            const active = globalForDb.__coopClient || target;
            try {
              const fn = active[prop];
              return await fn.apply(active, args);
            } catch (err: any) {
              const msg = String(err?.message || err);
              if (
                msg.includes("Aborted") ||
                msg.includes("checkpoint") ||
                msg.includes("PANIC") ||
                msg.includes("could not locate a valid checkpoint")
              ) {
                console.warn("[DB] Database abort detected during query execution. Initiating self-healing recovery...");
                globalForDb.__coopIsReady = false;
                globalForDb.__coopInitPromise = ensureDatabaseReady(globalForDb.__coopClient, true)
                  .then(() => {
                    globalForDb.__coopIsReady = true;
                  });
                await globalForDb.__coopInitPromise;
                const recovered = globalForDb.__coopClient;
                return await recovered[prop].apply(recovered, args);
              }
              throw err;
            }
          };
        }
        const active = globalForDb.__coopClient || target;
        const val = Reflect.get(active, prop, receiver);
        return typeof val === "function" ? val.bind(active) : val;
      },
    });

    db = drizzlePglite(clientProxy);

    globalForDb.__coopClient = client;
    globalForDb.__coopDb = db;

    // Trigger database readiness check on the client
    globalForDb.__coopInitPromise = ensureDatabaseReady(client)
      .then(() => {
        globalForDb.__coopIsReady = true;
      })
      .catch((err) => {
        console.error("[DB] Initialization error:", err);
      });
  } else {
    client = globalForDb.__coopClient;
    db = globalForDb.__coopDb;
  }
} else {
  if (!globalForDb.__coopDb) {
    const pool = new Pool({ connectionString: databaseUrl });
    client = pool;
    db = drizzlePg(pool);
    globalForDb.__coopPool = pool;
    globalForDb.__coopClient = pool;
    globalForDb.__coopDb = db;

    globalForDb.__coopInitPromise = ensureDatabaseReady(pool)
      .then(() => {
        globalForDb.__coopIsReady = true;
      })
      .catch((err) => {
        console.error("[DB] PostgreSQL Initialization error:", err);
      });
  } else {
    client = globalForDb.__coopPool;
    db = globalForDb.__coopDb;
  }
}

// Graceful cleanup to ensure WAL flushes cleanly on shutdown (register once across hot reloads)
if (!globalForDb.__coopCleanupRegistered && typeof process !== "undefined" && typeof process.on === "function") {
  globalForDb.__coopCleanupRegistered = true;
  let isCleaningUp = false;
  const cleanup = async () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    try {
      const active = globalForDb.__coopClient;
      if (active && typeof active.close === "function" && !active.closed) {
        await active.close();
      }
      if (globalForDb.__coopPool && typeof globalForDb.__coopPool.end === "function") {
        await globalForDb.__coopPool.end();
      }
    } catch {}
  };

  process.once("SIGINT", () => {
    cleanup().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    cleanup().finally(() => process.exit(0));
  });
}

export { db, client };

