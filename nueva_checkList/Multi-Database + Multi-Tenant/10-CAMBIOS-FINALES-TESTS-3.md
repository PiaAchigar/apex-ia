
## 🔟 AGREGAR: Tests de Setup (Fase 1)

**Dónde:** En "Tests Requeridos (Fase 1 modificada)"

**Agregar estos tests:**

```typescript
// tests/integration/setup.routes.test.ts

describe("Setup Flow - Validación en Tiempo Real", () => {
  it("debería validar DB después de 500ms (debounce)", async () => {
    // Escribe URL → espera 500ms → valida
    // No debería validar antes de 500ms
  });

  it("debería rechazar URL que no es Supabase", async () => {
    const result = await validateDatabase("https://google.com", "key");
    expect(result.valid).toBe(false);
  });

  it("debería rechazar service_role key", async () => {
    const result = await validateDatabase(url, "service_role_key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("anon");
  });

  it("debería aceptar anon key válida", async () => {
    const result = await validateDatabase(validUrl, validAnonKey);
    expect(result.valid).toBe(true);
  });
});

describe("Setup Flow - Timeout de 24h", () => {
  it("debería auto-cancel después de 24h sin completar setup", async () => {
    // Crear org, pagar, esperar 24h
    // Ejecutar cron job
    // Verificar: plan = "starter", stripeSubscriptionId = null
  });

  it("debería permitir reconectar después de auto-cancel", async () => {
    // Auto-cancel
    // Cliente paga de nuevo
    // Verificar: nuevo plan, nuevo deadline
  });

  it("debería enviar email de timeout", async () => {
    // Auto-cancel
    // Verificar: email enviado a admin
  });
});

describe("Setup Flow - Tabs UI", () => {
  it("debería mostrar TAB 1 por defecto", () => {
    render(<SetupPage />);
    expect(screen.getByText("CONECTAR BASE DE DATOS")).toBeVisible();
  });

  it("debería habilitar TAB 2 solo después de validar DB", async () => {
    // Validar DB
    // Verificar: TAB 2 enabled
  });

  it("debería habilitar TAB 3 solo después de inicializar schema", async () => {
    // Inicializar schema
    // Verificar: TAB 3 enabled
  });

  it("debería habilitar TAB 4 solo si ≥1 canal conectado", async () => {
    // Conectar 1 canal
    // Verificar: TAB 4 enabled
  });

  it("debería redirigir a /inbox después de completar setup", async () => {
    // Completar todos los tabs
    // Click en "Ir a Inbox"
    // Verificar: redirect a /[slug]/inbox
  });
});

describe("Rate Limiting en Setup", () => {
  it("debería permitir 5 intentos en 15 minutos", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await validateDatabase(invalidUrl, invalidKey);
      expect(res.status).not.toBe(429);
    }
  });

  it("debería retornar 429 después de 5 intentos", async () => {
    for (let i = 0; i < 5; i++) {
      await validateDatabase(invalidUrl, invalidKey);
    }
    
    const res6 = await validateDatabase(validUrl, validKey);
    expect(res6.status).toBe(429);
  });

  it("debería desbloquear después de 1 hora", async () => {
    // 5 intentos fallidos
    // Esperar 1 hora
    // Intentar de nuevo
    // Debería funcionar
  });
});
```

---

## 📋 Checklist: Cambios a ARCHITECTURE-CHANGES.md

- [ ] Agregar campos a organizations (paidAt, setupCompletedAt, setupDeadline)
- [ ] Agregar sección de timeout de 24h
- [ ] Actualizar n8m workflows logging
- [ ] Agregar tabla n8m_workflows en cliente DB schema
- [ ] Validación para rechazar service_role key
- [ ] Agregar error handling genérico
- [ ] Actualizar rate limiting a 5/15min
- [ ] Agregar modal de ayuda para credenciales
- [ ] Agregar tests de setup (debounce, timeout, tabs, rate limiting)

---

## ✅ Una Vez Apliques Estos Cambios

1. ARCHITECTURE-CHANGES.md estará 100% actualizado con decisiones finales
2. CLAUDE.md quedará actualizado (con HOW-TO-UPDATE-CLAUDE.md)
3. Listo para pasar a Claude Code

**Tiempo:** ~30 minutos de edición

---

## 🚀 Comando para Claude Code

```
"Implementá Fase 1 según:
- docs/CLAUDE.md (actualizado)
- docs/ARCHITECTURE-CHANGES.md (dual-database)
- docs/CAMBIOS-FINALES-ARCHITECTURE.md (decisiones aplicadas)

Decisiones confirmadas:
1. Setup: 1 página con 4 tabs (Conectar DB → Schema → Canales → Confirmar)
2. Validación: en tiempo real (debounce 500ms)
3. Auto-cancel: 24h sin completar setup
4. n8m: solo logging en cliente DB (Fase 1)
5. Rate limiting: 5 intentos/15min
6. Documentación: modal en-app
7. Errores: mensajes genéricos

¿Empezás?"
```

---

Listo. Estos son todos los cambios finales. 🎯
