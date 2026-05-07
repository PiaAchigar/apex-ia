import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as publicSchema from "@apex-ia/database/schema/public";
import * as tenantSchema from "@apex-ia/database/schema/tenant";
import { ClientDatabaseService } from "../services/ClientDatabaseService.js";
import type { DrizzleDb } from "./drizzle.js";
import { logger } from "../utils/logger.js";

export type ClientDrizzleDb = DrizzleDb;

interface CacheEntry {
  db: ClientDrizzleDb;
  lastUsed: number;
  client: postgres.Sql;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function evictStaleConnections(): void {
  const now = Date.now();
  for (const [orgId, entry] of cache) {
    if (now - entry.lastUsed > CACHE_TTL_MS) {
      entry.client.end().catch(() => {});
      cache.delete(orgId);
      logger.debug({ orgId }, "Evicted stale client DB connection from cache");
    }
  }
}

setInterval(evictStaleConnections, 5 * 60 * 1000);

class DatabaseProvider {
  private readonly clientDbService = new ClientDatabaseService();

  async getClientDrizzle(organizationId: string): Promise<ClientDrizzleDb> {
    const cached = cache.get(organizationId);
    if (cached && Date.now() - cached.lastUsed < CACHE_TTL_MS) {
      cached.lastUsed = Date.now();
      return cached.db;
    }

    const databaseUrl = await this.clientDbService.getClientDatabaseUrl(organizationId);

    const client = postgres(databaseUrl, {
      prepare: false,
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
    });

    const drizzleInstance = drizzle(client, {
      schema: { ...publicSchema, ...tenantSchema },
    }) as DrizzleDb;

    cache.set(organizationId, {
      db: drizzleInstance,
      lastUsed: Date.now(),
      client,
    });

    logger.debug({ organizationId }, "Created new client DB connection");

    return drizzleInstance;
  }

  invalidate(organizationId: string): void {
    const entry = cache.get(organizationId);
    if (entry) {
      entry.client.end().catch(() => {});
      cache.delete(organizationId);
    }
  }
}

export const databaseProvider = new DatabaseProvider();
