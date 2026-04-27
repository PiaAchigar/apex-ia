import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export type ModuleAccess = {
  read: boolean;
  write: boolean;
};

export type PermissionsJson = {
  inbox: ModuleAccess;
  contacts: ModuleAccess;
  pipeline: ModuleAccess;
  tasks: ModuleAccess;
  calendar: ModuleAccess;
  campaigns: ModuleAccess;
  flowBuilder: ModuleAccess;
  templates: ModuleAccess;
  analytics: { read: boolean };
  reports: { read: boolean };
  callLogs: { read: boolean };
  settings: ModuleAccess;
  team: ModuleAccess;
  billing: ModuleAccess;
  apiAccess: ModuleAccess;
  aiCredentials: ModuleAccess;
};

export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionsJson> = {
  admin: {
    inbox: { read: true, write: true },
    contacts: { read: true, write: true },
    pipeline: { read: true, write: true },
    tasks: { read: true, write: true },
    calendar: { read: true, write: true },
    campaigns: { read: true, write: true },
    flowBuilder: { read: true, write: true },
    templates: { read: true, write: true },
    analytics: { read: true },
    reports: { read: true },
    callLogs: { read: true },
    settings: { read: true, write: true },
    team: { read: true, write: true },
    billing: { read: true, write: true },
    apiAccess: { read: true, write: true },
    aiCredentials: { read: true, write: true },
  },
  prime: {
    inbox: { read: true, write: true },
    contacts: { read: true, write: true },
    pipeline: { read: true, write: true },
    tasks: { read: true, write: true },
    calendar: { read: true, write: true },
    campaigns: { read: true, write: true },
    flowBuilder: { read: true, write: true },
    templates: { read: true, write: true },
    analytics: { read: true },
    reports: { read: true },
    callLogs: { read: true },
    settings: { read: true, write: true },
    team: { read: true, write: false },
    billing: { read: true, write: false },
    apiAccess: { read: true, write: true },
    aiCredentials: { read: true, write: false },
  },
  standard: {
    inbox: { read: true, write: true },
    contacts: { read: true, write: false },
    pipeline: { read: true, write: true },
    tasks: { read: true, write: true },
    calendar: { read: true, write: false },
    campaigns: { read: false, write: false },
    flowBuilder: { read: false, write: false },
    templates: { read: true, write: false },
    analytics: { read: false },
    reports: { read: false },
    callLogs: { read: false },
    settings: { read: false, write: false },
    team: { read: false, write: false },
    billing: { read: false, write: false },
    apiAccess: { read: false, write: false },
    aiCredentials: { read: false, write: false },
  },
  ai_agent: {
    inbox: { read: true, write: true },
    contacts: { read: true, write: false },
    pipeline: { read: false, write: false },
    tasks: { read: false, write: false },
    calendar: { read: false, write: false },
    campaigns: { read: false, write: false },
    flowBuilder: { read: false, write: false },
    templates: { read: false, write: false },
    analytics: { read: false },
    reports: { read: false },
    callLogs: { read: false },
    settings: { read: false, write: false },
    team: { read: false, write: false },
    billing: { read: false, write: false },
    apiAccess: { read: false, write: false },
    aiCredentials: { read: false, write: false },
  },
};

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  permissionsJson: jsonb("permissions_json").$type<PermissionsJson>().notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
