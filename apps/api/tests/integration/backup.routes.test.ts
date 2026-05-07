import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createBackupRoutes } from "../../src/routes/settings/backup.routes.js";

const mockBackupMethods = {
  createBackup: vi.fn(),
  listBackups: vi.fn(),
  restoreBackup: vi.fn(),
  deleteBackup: vi.fn(),
};

vi.mock("../../src/services/BackupService.js", () => ({
  BackupService: vi.fn().mockImplementation(() => mockBackupMethods),
}));

vi.mock("../../src/middleware/authMiddleware.js", () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("auth", {
      userId: "user-1",
      organizationId: "org-1",
      organizationSlug: "test-org",
      roleName: "admin",
      permissions: {},
    });
    await next();
  }),
}));

vi.mock("../../src/middleware/tenantMiddleware.js", () => ({
  tenantMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set("tenantDb", {});
    await next();
  }),
}));

vi.mock("../../src/db/supabase-admin.js", () => ({
  supabaseAdmin: {},
}));

function buildApp() {
  const app = new Hono();
  app.route("/settings/backups", createBackupRoutes());
  return app;
}

describe("GET /settings/backups", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 con lista de backups", async () => {
    const mockBackups = [
      {
        id: "backup-1",
        organizationId: "org-1",
        fileName: "backup-1234567890.json",
        status: "completed",
        createdAt: new Date(),
      },
    ];

    mockBackupMethods.listBackups.mockResolvedValueOnce(mockBackups);

    const res = await app.request("/settings/backups");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{ fileName: string }>;
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /settings/backups", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 201 al crear backup", async () => {
    const mockBackup = {
      id: "backup-2",
      organizationId: "org-1",
      fileName: "backup-1234567890.json",
      status: "completed",
      createdAt: new Date(),
    };

    mockBackupMethods.createBackup.mockResolvedValueOnce(mockBackup);

    const res = await app.request("/settings/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("backup-2");
  });

  it("debería retornar 500 si hay error", async () => {
    mockBackupMethods.createBackup.mockRejectedValueOnce(
      new Error("BACKUP_CREATE_FAILED: Storage error")
    );

    const res = await app.request("/settings/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
  });
});

describe("POST /settings/backups/:id/restore", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al restaurar backup", async () => {
    mockBackupMethods.restoreBackup.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/backups/backup-1/restore", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { message: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.message).toContain("restored");
  });

  it("debería retornar 500 si backup no existe", async () => {
    mockBackupMethods.restoreBackup.mockRejectedValueOnce(
      new Error("BACKUP_NOT_FOUND")
    );

    const res = await app.request("/settings/backups/backup-1/restore", {
      method: "POST",
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});

describe("DELETE /settings/backups/:id", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  it("debería retornar 200 al eliminar backup", async () => {
    mockBackupMethods.deleteBackup.mockResolvedValueOnce(undefined);

    const res = await app.request("/settings/backups/backup-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { message: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.message).toContain("deleted");
  });

  it("debería retornar 500 si hay error", async () => {
    mockBackupMethods.deleteBackup.mockRejectedValueOnce(
      new Error("BACKUP_NOT_FOUND")
    );

    const res = await app.request("/settings/backups/backup-1", {
      method: "DELETE",
    });

    expect(res.status).toBe(500);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});
