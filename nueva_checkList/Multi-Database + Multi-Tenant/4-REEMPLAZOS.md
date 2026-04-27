## 🎯 Cambios en fase-1.md

**Reemplazar la sección "Register"** (paso 2-3) con:

```markdown
4. Implementar Auth con Supabase Auth
   - Register: crear usuario en MI Supabase Auth → insertar en tabla users → seleccionar plan
   - Post-pago Stripe: redirigir a /setup/connect-database
   - Setup: cliente proporciona URL + API Key de SU Supabase
   - Validar: conectar y ejecutar migraciones en cliente DB
   - Login: Supabase Auth → devuelve JWT (MI instancia)
   - `authMiddleware.ts` → verifica JWT de MI Supabase
   - `tenantMiddleware.ts` → detecta slug en URL + resuelve cliente DB
```

---

## 📋 Resumen de Cambios

| Archivo | Cambios | Urgencia |
|---|---|---|
| CLAUDE.md | Sección "Database" + agregueaciones de tablas + servicios | 🔴 Alta |
| fase-1.md | Ampliar con setup flow (4 pasos nuevos) | 🔴 Alta |
| fase-2.md | Todos los servicios reciben `organizationId` | 🟡 Media |
| fase-3.md | Igual que fase 2 | 🟡 Media |
| Resto fases | Igual que fase 2 | 🟡 Media |

---

## ⚡ Copiar/Pegar

**En terminal:**
```bash
# Abrir CLAUDE.md
nano apps/api/docs/CLAUDE.md

# Buscar "### Base de Datos: Supabase (OBLIGATORIO)" (línea ~61)
# Reemplazar la sección con lo de arriba

# Continuar con cada sección...
```

**O:** Copiar `ARCHITECTURE-CHANGES.md` + esta guía, y pedir a Claude Code que actualice CLAUDE.md siguiendo estas instrucciones punto por punto.

---

## ✅ Verificación

Una vez actualizado CLAUDE.md, debería tener:

- [ ] Sección "Multi-Database Architecture" al final
- [ ] `client_databases` en schema público
- [ ] `ClientDatabaseService.ts` en lista de servicios
- [ ] `database-provider.ts` en lista de helpers
- [ ] `setup.routes.ts` en lista de rutas
- [ ] Variables de entorno `CLIENT_DB_ENCRYPTION_KEY` en `.env.example`
- [ ] Setup flow documentado en Fase 1
- [ ] ⚠️ notas en cada servicio diciendo que reciben `organizationId`
