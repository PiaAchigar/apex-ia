import { vi } from "vitest";

vi.mock("../src/db/supabase-admin.js", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
        signOut: vi.fn(),
      },
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({ limit: vi.fn(() => ({ data: null, error: null })) })),
    })),
  },
}));

vi.mock("../src/db/drizzle.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
  createTenantDb: vi.fn(),
}));
