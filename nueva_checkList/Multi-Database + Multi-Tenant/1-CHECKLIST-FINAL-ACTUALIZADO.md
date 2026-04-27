# CHECKLIST-FINAL-ACTUALIZADO.md
## Plan Completo ACTUALIZACION: 2 Fases 

---

## 📊 Overview

```
FASE 0: Seguridad 
  ├─ Generar keys
  ├─ Implementar CORS
  ├─ Implementar Rate Limiting
  ├─ Agregar Zod Validators
  └─ Implementar Security Headers

FASE 1: Setup Dual-Database (40 minutos)
  ├─ Actualizar CLAUDE.md
  ├─ Copiar documentos a repo
  ├─ Aplicar cambios finales a ARCHITECTURE-CHANGES.md
  └─ Listo para Claude Code
```
**Resultado:** Código seguro + arquitectura dual-database

---

## 🔐 FASE 0: SEGURIDAD - Listo ✅

### Paso 0.1: Generar Keys

**Checklist:**
- [ ] Keys generadas
- [ ] Keys guardadas en `.env` (NO compartir, NO commitear)
- [ ] `.env` agregado a `.gitignore`

---

### Paso 0.2: CORS (SECURITY-CONFIG.md) - Listo ✅


## ✅ FASE 1: SETUP DUAL-DATABASE 

### Paso 1.1: CLIENT_DB_ENCRYPTION_KEY (Listo ✅)

### Paso 1.2: Actualizar CLAUDE.md

**Usar:** `2-HOW-TO-UPDATE-CLAUDE.md` como guía

**Secciones a actualizar:**

1. [ ] Sección "Base de Datos" (línea ~61)
2. [ ] "Schema de Base de Datos" (agregar `client_databases`)
3. [ ] "Middleware" (actualizar `tenantMiddleware`)
4. [ ] "Servicios" (agregar notas sobre `organizationId`)
5. [ ] "Rutas" (agregar `setup.routes.ts`)
6. [ ] "Frontend Pages" (agregar `/setup`)
7. [ ] "Variables de Entorno" (agregar `CLIENT_DB_ENCRYPTION_KEY`)
8. [ ] "Fases" (actualizar Fase 1)
9. [ ] Agregar sección "Multi-Database Architecture"


---

### Paso 1.3: Aplicar Cambios Finales a ARCHITECTURE-CHANGES.md

**Usar:** `5-CAMBIOS-FINALES-ARCHITECTURE.md` como guía

**10 cambios a aplicar:**

1. [ ] Agregar campos a `organizations` (paidAt, setupCompletedAt, setupDeadline)
2. [ ] Agregar sección de timeout de 24h, para el envio de mails.
3. [ ] Actualizar n8m workflows logging
4. [ ] Agregar tabla `n8m_workflows` en cliente DB schema
5. [ ] Validación para rechazar service_role key
6. [ ] Agregar error handling genérico
7. [ ] Actualizar rate limiting a 5/15min
8. [ ] Agregar modal de ayuda para credenciales
9. [ ] Agregar tests de setup (debounce, timeout, etc.)
10. [ ] Verificar Setup tabs (5→1 página) ✅


**Checklist:**
- [ ] Todos los 10 cambios aplicados
- [ ] ARCHITECTURE-CHANGES.md actualizado

## Una Vez finalices todo. 
Modificá el CLAUDE.md con la nueva arquitectura DUAL-DATABASE, si aun no lo hiciste.
      


