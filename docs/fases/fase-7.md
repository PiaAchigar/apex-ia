### FASE 7 — Settings Avanzados (Semana 14)
**Objetivo:** Gestión de equipo, API Keys, personalización, Backup.

**Tareas:**
> **⚠️ Arquitectura Dual-Database:** Los servicios de esta fase que tocan datos operacionales
> reciben `organizationId` y usan `DatabaseProvider.getClientDrizzle(organizationId)`.
> `BillingService`, `TeamService` y `ApiKeyService` siguen en MI Supabase.
> Ver `docs/ARCHITECTURE-CHANGES.md` → "Impacto en Cada Servicio".


1. `TeamService.ts`
   - `inviteTeamMember(email, role, permissions)` → enviar email de invitación
   - `updateTeamMemberRole(userId, newRole)`
   - `updateTeamMemberPermissions(userId, permissions)` → granular por módulo
   - `removeTeamMember(userId)`

2. `ApiKeyService.ts`
   - `generateApiKeyForOrganization(orgId, name)` → genera hash seguro
   - `revokeApiKey(keyId)`
   - `validateApiKeyAndGetOrganization(rawKey)` → usado en authMiddleware

3. Pages CMS: CRUD para páginas públicas (Terms, Privacy, custom)

4. Custom CSS / Custom JS: guardar en `channel_credentials` o tabla propia, inyectar en dashboard del tenant

5. Backup & Restore:
   - `createDatabaseBackupForTenant(orgId)` → pg_dump del schema tenant, subir a Supabase Storage
   - `restoreDatabaseBackupForTenant(orgId, backupId)`

6. Audit trail: registrar en `audit_logs` todas las acciones críticas (delete contact, change role, etc.)

**Tests requeridos:**
```
tests/unit/TeamService.test.ts
tests/unit/ApiKeyService.test.ts
tests/integration/settings.routes.test.ts    → team, api-keys, pages
```

**STOP ✋ — Al terminar:**
> "✅ Fase 7 completada. Implementé: Team + Roles + Permisos, API Keys, Pages CMS, Custom CSS/JS, Backup. ¿Confirmas que avanzo a la Fase 8 (Billing + Go-Live)?"
