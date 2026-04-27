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

export type PermissionModule = keyof PermissionsJson;

export type PermissionAction<M extends PermissionModule> =
  PermissionsJson[M] extends { write: boolean } ? "read" | "write" : "read";
