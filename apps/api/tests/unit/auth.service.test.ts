import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "../../src/services/AuthService.js";

const mockSupabaseAdmin = await import("../../src/db/supabase-admin.js");
const mockDb = await import("../../src/db/drizzle.js");

const MOCK_PERMISSIONS = {
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
};

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  describe("registerUserAndOrganization", () => {
    it("debería lanzar error si el slug ya está en uso", async () => {
      vi.mocked(mockDb.db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-org-id" }]),
          }),
        }),
      } as never);

      await expect(
        authService.registerUserAndOrganization({
          email: "test@example.com",
          password: "password123",
          fullName: "Test User",
          organizationName: "Test Org",
          organizationSlug: "test-org",
        })
      ).rejects.toThrow("SLUG_TAKEN");
    });

    it("debería lanzar error si Supabase Auth falla", async () => {
      vi.mocked(mockDb.db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never);

      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.admin.createUser
      ).mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Email already exists", status: 422, name: "AuthApiError" },
      } as never);

      await expect(
        authService.registerUserAndOrganization({
          email: "existing@example.com",
          password: "password123",
          fullName: "Test User",
          organizationName: "Test Org",
          organizationSlug: "new-slug",
        })
      ).rejects.toThrow("AUTH_CREATE_FAILED");
    });

    it("debería crear organización, usuario y schema de tenant correctamente", async () => {
      const mockOrgId = "org-uuid-123";
      const mockUserId = "user-uuid-123";
      const mockRoleId = "admin-role-uuid";

      vi.mocked(mockDb.db.select)
        .mockReturnValueOnce({
          // slug check → not found
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as never)
        .mockReturnValueOnce({
          // admin role lookup
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: mockRoleId }]),
            }),
          }),
        } as never);

      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.admin.createUser
      ).mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      } as never);

      vi.mocked(mockDb.db.insert)
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: mockOrgId, slug: "acme", name: "Acme Corp", plan: "starter" },
            ]),
          }),
        } as never)
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        } as never)
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue(undefined),
        } as never);

      const result = await authService.registerUserAndOrganization({
        email: "new@example.com",
        password: "password123",
        fullName: "New User",
        organizationName: "Acme Corp",
        organizationSlug: "acme",
      });

      expect(result.userId).toBe(mockUserId);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.organizationSlug).toBe("acme");
    });
  });

  describe("loginWithEmailAndPassword", () => {
    it("debería lanzar error con credenciales incorrectas", async () => {
      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.signInWithPassword
      ).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid credentials", status: 400, name: "AuthApiError" },
      } as never);

      await expect(
        authService.loginWithEmailAndPassword({
          email: "wrong@example.com",
          password: "wrongpass",
        })
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });

    it("debería retornar tokens y datos de rol con credenciales válidas", async () => {
      const mockUserId = "user-uuid-123";
      const mockOrgId = "org-uuid-123";
      const mockRoleId = "admin-role-uuid";

      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.signInWithPassword
      ).mockResolvedValueOnce({
        data: {
          session: {
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_at: 9999999999,
          },
          user: { id: mockUserId },
        },
        error: null,
      } as never);

      vi.mocked(mockDb.db.select)
        .mockReturnValueOnce({
          // users JOIN roles
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: mockUserId,
                    organizationId: mockOrgId,
                    roleId: mockRoleId,
                    roleName: "admin",
                    permissions: MOCK_PERMISSIONS,
                  },
                ]),
              }),
            }),
          }),
        } as never)
        .mockReturnValueOnce({
          // org slug
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ slug: "acme" }]),
            }),
          }),
        } as never);

      const result = await authService.loginWithEmailAndPassword({
        email: "user@example.com",
        password: "correct-password",
      });

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.organizationSlug).toBe("acme");
      expect(result.roleName).toBe("admin");
      expect(result.roleId).toBe(mockRoleId);
      expect(result.permissions).toEqual(MOCK_PERMISSIONS);
    });
  });

  describe("refreshAccessToken", () => {
    it("debería lanzar error con refresh token inválido", async () => {
      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.refreshSession
      ).mockResolvedValueOnce({
        data: { session: null },
        error: { message: "Invalid token", status: 401, name: "AuthApiError" },
      } as never);

      await expect(
        authService.refreshAccessToken("invalid-token")
      ).rejects.toThrow("INVALID_REFRESH_TOKEN");
    });

    it("debería retornar nuevos tokens con refresh token válido", async () => {
      vi.mocked(
        mockSupabaseAdmin.supabaseAdmin.auth.refreshSession
      ).mockResolvedValueOnce({
        data: {
          session: {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_at: 9999999999,
          },
        },
        error: null,
      } as never);

      const result = await authService.refreshAccessToken("valid-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });
  });
});
