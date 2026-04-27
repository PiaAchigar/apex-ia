## Estrategia de Testing — OBLIGATORIO por cada fase

### Regla general
No se cierra ninguna tarea sin su test. Cobertura mínima: **80% en servicios**, **60% en rutas**.

### Herramientas
| Herramienta | Uso |
|---|---|
| Vitest | Unit tests e integration tests en el backend |
| React Testing Library | Componentes React |
| Playwright | E2E (solo flujos críticos) |
| Supertest | Tests de endpoints HTTP |

### Base de datos para tests
Usar Supabase local (`supabase start`) o un proyecto Supabase de staging dedicado.
```
TEST_DATABASE_URL=    # Supabase local o staging
```

### Estructura de tests
```typescript
// Unit test — lógica de negocio aislada con mocks
// apps/api/tests/unit/InboxService.test.ts
describe("InboxService", () => {
  it("createConversationFromIncomingMessage debería setear status 'open' por defecto")
  it("assignConversationToAgent debería lanzar error si el agente no pertenece al tenant")
  it("markConversationAsResolved debería actualizar status y timestamp")
})

// Integration test — endpoint real con DB de test
// apps/api/tests/integration/inbox.routes.test.ts
describe("POST /inbox/conversations", () => {
  it("debería retornar 201 con la conversación creada")
  it("debería retornar 401 si no hay JWT")
  it("debería retornar 403 si el agente no tiene permiso")
})

// E2E — flujo completo usuario final (solo flujos críticos)
// apps/api/tests/e2e/inbox-flow.spec.ts
test("agente puede recibir mensaje de WhatsApp, responder y resolver la conversación")
```
