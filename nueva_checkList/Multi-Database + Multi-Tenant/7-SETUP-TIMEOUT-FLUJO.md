
## 🔄 Flujo: Desde Pago hasta Acceso

```
┌─────────────────┐
│ Cliente Paga    │
│ Mercado Pago    │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Webhook: POST /webhooks/mercadopago│
├────────────────────────────────────┤
│ 1. Validar pago                    │
│ 2. Crear fila en organizations:    │
│    - plan = 'growth'               │
│    - paidAt = NOW()                │
│    - setupDeadline = NOW() + 24h   │
│    - setupCompletedAt = NULL       │
│    - isSetupBlocked = false        │
│ 3. Enviar email:                   │
│    "¡Bienvenido! Tienes 24h para   │
│     completar setup"               │
└────────┬───────────────────────────┘
         │
         ▼ (Cliente accede al dashboard)
┌────────────────────────────────────┐
│ Middleware: checkSetupStatus()     │
├────────────────────────────────────┤
│ IF setupCompletedAt IS NULL        │
│    AND setupDeadline < NOW()       │
│    THEN:                           │
│      - isSetupBlocked = true       │
│      - return 403 (Setup Required) │
│      - redirect a /setup           │
│ ELSE:                              │
│      - Acceso normal               │
└────────┬───────────────────────────┘
         │
         ├─ Setup NOT completado
         │  ↓
         ├──────────────────────────────────┐
         │                                  │
         │  ┌────────────────────────────┐  │
         │  │ Dashboard Bloqueado        │  │
         │  │                            │  │
         │  │ "Completa setup en 24h"    │  │
         │  │ [Button: Ir a Setup]       │  │
         │  │                            │  │
         │  │ Cron: Email cada 6h        │  │
         │  │ "No olvides completar setup"│ │
         │  └────────────────────────────┘  │
         │                                  │
         └──────────────────────────────────┘
         │
         ├─ Setup SÍ completado
         │  ↓
         ├──────────────────────────────────┐
         │                                  │
         │  ┌────────────────────────────┐  │
         │  │ Dashboard Desbloqueado     │  │
         │  │                            │  │
         │  │ Acceso total al producto   │  │
         │  │ Suscripción activa en MP   │  │
         │  │                            │  │
         │  └────────────────────────────┘  │
         │                                  │
         └──────────────────────────────────┘
```

