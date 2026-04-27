# SETUP-TIMEOUT-REDESIGNED.md
## Auto-bloqueo de acceso después de 24h sin completar Setup

---

## 🎯 Cambio Conceptual

**ANTES (cancelar suscripción):**
```
Cliente paga → 24h sin setup → Cancelar suscripción → Volver a pagar
❌ Mala experiencia
```

**AHORA (bloquear acceso, no cancelar):**
```
Cliente paga → 24h sin setup → Bloquear acceso + Email → Complete setup para usar
✅ Mejor experiencia (no pierde su pago)
```

---

## ⏰ Auto-bloqueo después de 24h sin completar Setup

**¿Qué pasa?**
- Cliente paga en Mercado Pago → recibe email: "Tienes 24h para completar setup"
- Si completa setup en 24h: nada especial, sigue usando normalmente
- Si NO completa: 
  - **SU SUSCRIPCIÓN SE MANTIENE ACTIVA** (no se cancela)
  - Se le bloquea acceso al dashboard (solo ve botón de setup)
  - Recibe email: "Necesitas completar setup para usar el producto"
  - Cuando complete setup: vuelve a tener acceso inmediatamente

**Ventaja:**
- No pierde su pago
- Incentiva a completar setup sin stress
- Cliente siempre tiene acceso a la información de setup
- Puede completar setup en cualquier momento

---

## 📊 Estados de una Organization

```typescript
export interface Organization {
  id: UUID
  slug: string
  name: string
  plan: 'starter' | 'growth' | 'business'
  
  // Mercado Pago
  mpCustomerId: string
  mpSubscriptionId: string
  mpStatus: 'active' | 'paused' | 'cancelled'  // Estado en MP
  
  // Setup Timeline
  paidAt: timestamp              // Cuándo confirmó pago
  setupCompletedAt: timestamp    // Cuándo completó setup (NULL si no completó)
  setupDeadline: timestamp       // paidAt + 24 horas
  isSetupBlocked: boolean        // ¿Setup timeout ocurrió? (para UI)
  
  createdAt: timestamp
}
```
## 🔄 Flujo: Desde Pago hasta Acceso : 7-SETUP-TIMEOUT-FLUJO.md


## 🛠️ Implementación

### 1. Schema en Drizzle

```typescript
// packages/database/schema/public/organizations.ts

export const organizations = pgTable("organizations", {
  id:                   uuid("id").primaryKey().defaultRandom(),
  slug:                 varchar("slug", { length: 50 }).unique().notNull(),
  name:                 varchar("name", { length: 100 }).notNull(),
  plan:                 text("plan").default("starter"),  // starter | growth | business
  
  // Mercado Pago
  mpCustomerId:         varchar("mp_customer_id"),
  mpSubscriptionId:     varchar("mp_subscription_id"),
  mpStatus:             text("mp_status").default("active"),  // active | paused | cancelled
  
  // Setup Timeline
  paidAt:               timestamp("paid_at"),              // Cuándo confirmó pago
  setupCompletedAt:     timestamp("setup_completed_at"),  // Cuándo completó setup
  setupDeadline:        timestamp("setup_deadline"),      // paidAt + 24 horas
  isSetupBlocked:       boolean("is_setup_blocked").default(false),  // ¿Está bloqueado?
  
  createdAt:            timestamp("created_at").defaultNow(),
})
```

---

### 2. Webhook de Mercado Pago

```typescript
// apps/api/src/routes/webhooks/mercadopago.routes.ts

router.post('/webhooks/mercadopago', async (c) => {
  const body = await c.req.json()
  
  // Validar firma de Mercado Pago
  // (ver docs de MP para esto)
  
  if (body.type === 'payment') {
    const payment = body.data
    
    if (payment.status === 'approved') {
      // 1. Obtener cliente desde metadata
      const userId = payment.metadata.userId  // lo pasaste al crear sesión de pago
      const plan = payment.metadata.plan      // 'growth' o 'business'
      
      // 2. Actualizar organization
      await db.update(organizations)
        .set({
          mpCustomerId: payment.customer_id,
          mpSubscriptionId: payment.id,
          mpStatus: 'active',
          plan: plan,
          paidAt: new Date(),
          setupDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // NOW + 24h
          setupCompletedAt: null,  // Sin completar aún
          isSetupBlocked: false,   // No bloqueado (aún tiene 24h)
        })
        .where(eq(organizations.id, userId))
      
      // 3. Registrar en audit_logs
      await db.insert(auditLogs).values({
        userId: userId,
        action: 'organization.payment_confirmed',
        resourceType: 'organization',
        resourceId: userId,
        newValuesJson: { plan, mpStatus: 'active' },
      })
      
      // 4. Enviar email de bienvenida
      await sendTransactionalEmail({
        to: userEmail,
        subject: '¡Bienvenido a Apex IA! Complete setup en 24h',
        template: 'payment_confirmed_setup_required',
        data: {
          organizationName: organization.name,
          setupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/setup`,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('es-AR')
        }
      })
    }
  }
  
  return c.json({ ok: true })
})
```

---

### 3. Middleware: Validar Setup Status

```typescript
// apps/api/src/middleware/checkSetupStatusMiddleware.ts

export const checkSetupStatusMiddleware = async (c: Context, next: Next) => {
  const organizationId = c.get('organizationId')
  
  if (!organizationId) {
    return next()  // No autenticado, saltar
  }
  
  // Buscar organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
  
  if (!org.length) {
    return next()
  }
  
  const organization = org[0]
  
  // ¿Setup completado?
  if (organization.setupCompletedAt) {
    return next()  // Setup ok, continuar
  }
  
  // ¿Pasaron 24h?
  if (organization.setupDeadline && organization.setupDeadline < new Date()) {
    // ¿Ya fue bloqueado antes?
    if (!organization.isSetupBlocked) {
      // Bloquearlo ahora
      await db.update(organizations)
        .set({ isSetupBlocked: true })
        .where(eq(organizations.id, organizationId))
      
      // Enviar email
      await sendTransactionalEmail({
        to: userEmail,
        subject: 'Setup requerido para usar Apex IA',
        template: 'setup_timeout_notification',
        data: { setupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/setup` }
      })
      
      // Audit
      await db.insert(auditLogs).values({
        action: 'organization.setup_blocked_timeout',
        resourceType: 'organization',
        resourceId: organizationId,
      })
    }
    
    // Bloquear acceso al dashboard
    return c.json(
      { error: 'Setup requerido. Completa la configuración inicial para continuar.' },
      403
    )
  }
  
  // Todavía está en el plazo de 24h
  return next()
}
```

**En `apps/api/src/index.ts`:**

```typescript
app.use(authMiddleware)
app.use(tenantMiddleware)
app.use(checkSetupStatusMiddleware)  // ← Después de auth/tenant, antes de rutas
app.use(rateLimitMiddleware)
```

---

Sigue en `8-SETUP-TIMEOUT-2.md`