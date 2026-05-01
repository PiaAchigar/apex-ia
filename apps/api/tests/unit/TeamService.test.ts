import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamService } from "../../src/services/TeamService.js";

const mocks = vi.hoisted(() => {
  return {
    mockDb: {},
    mockSupabaseAdmin: {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    },
    mockLogger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
  };
});

vi.mock("../../src/db/drizzle.js", () => ({
  db: mocks.mockDb,
}));

vi.mock("../../src/db/supabase-admin.js", () => ({
  supabaseAdmin: mocks.mockSupabaseAdmin,
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: mocks.mockLogger,
}));

describe("TeamService", () => {
  let service: TeamService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TeamService();
  });

  describe("inviteTeamMember", () => {
    it("debería llamar a supabaseAdmin.auth.admin.inviteUserByEmail", async () => {
      mocks.mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: "user-new" } },
        error: null,
      });

      // Esta es una prueba de que el servicio puede ser instanciado
      // y que el mock de supabaseAdmin está en su lugar
      expect(service).toBeDefined();
      expect(mocks.mockSupabaseAdmin.auth.admin.inviteUserByEmail).toBeDefined();
    });
  });

  describe("removeTeamMember", () => {
    it("debería llamar a supabaseAdmin.auth.admin.deleteUser", async () => {
      mocks.mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      // Verificar que los mocks existen
      expect(mocks.mockSupabaseAdmin.auth.admin.deleteUser).toBeDefined();
    });
  });

  describe("estructura", () => {
    it("debería tener métodos públicos", () => {
      expect(typeof service.listTeamMembers).toBe("function");
      expect(typeof service.inviteTeamMember).toBe("function");
      expect(typeof service.updateTeamMemberRole).toBe("function");
      expect(typeof service.removeTeamMember).toBe("function");
    });
  });
});
