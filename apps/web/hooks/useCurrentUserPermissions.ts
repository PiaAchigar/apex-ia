import { useAuthStore } from "@/stores/authStore";
import type { PermissionModule, PermissionsJson } from "@/lib/permissions";

type WriteableModule = {
  [K in PermissionModule]: PermissionsJson[K] extends { write: boolean } ? K : never;
}[PermissionModule];

type ReadonlyModule = Exclude<PermissionModule, WriteableModule>;

function can(
  permissions: PermissionsJson | null | undefined,
  module: WriteableModule,
  action: "read" | "write"
): boolean;
function can(
  permissions: PermissionsJson | null | undefined,
  module: ReadonlyModule,
  action: "read"
): boolean;
function can(
  permissions: PermissionsJson | null | undefined,
  module: PermissionModule,
  action: "read" | "write"
): boolean {
  if (!permissions) return false;
  const mod = permissions[module] as { read: boolean; write?: boolean };
  if (action === "write") return mod.write ?? false;
  return mod.read;
}

export function useCurrentUserPermissions() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? null);
  const roleName = useAuthStore((s) => s.user?.roleName ?? null);

  return {
    permissions,
    roleName,
    isAdmin: roleName === "admin",
    can: (module: PermissionModule, action: "read" | "write" = "read") =>
      can(permissions, module as WriteableModule, action),
  };
}
