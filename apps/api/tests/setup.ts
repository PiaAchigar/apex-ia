import { vi } from "vitest";

// Setup environment variables for tests
process.env.WHATSAPP_CLOUD_API_TOKEN = "test-whatsapp-token";
process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";
process.env.INSTAGRAM_VERIFY_TOKEN = "test-instagram-token";
process.env.FACEBOOK_VERIFY_TOKEN = "test-facebook-token";
process.env.META_APP_SECRET = "test-meta-secret";
process.env.TELEGRAM_BOT_TOKEN = "test-telegram-token";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-telegram-secret";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.NODE_ENV = "test";

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
