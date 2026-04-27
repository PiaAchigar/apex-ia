### 4. Cron Job: Recordatorios por Email

```typescript
// apps/api/src/jobs/setup-reminder.job.ts

export async function sendSetupReminders() {
  // Encontrar orgs que:
  // - NO completaron setup
  // - Están dentro de las 24h
  // - Aún NO fueron bloqueadas
  
  const remindOrgs = await db
    .select()
    .from(organizations)
    .where(and(
      isNull(organizations.setupCompletedAt),
      gt(organizations.setupDeadline, now()),  // Aún hay tiempo
      eq(organizations.isSetupBlocked, false)   // No bloqueadas aún
    ))
  
  for (const org of remindOrgs) {
    const hoursLeft = Math.ceil(
      (org.setupDeadline.getTime() - Date.now()) / (1000 * 60 * 60)
    )
    
    if (hoursLeft === 18 || hoursLeft === 12 || hoursLeft === 6) {
      // Enviar recordatorio
      await sendTransactionalEmail({
        to: org.adminEmail,
        subject: `⏰ ${hoursLeft}h para completar setup en Apex IA`,
        template: 'setup_reminder',
        data: {
          organizationName: org.name,
          hoursLeft,
          setupUrl: `${process.env.NEXT_PUBLIC_APP_URL}/setup`
        }
      })
      
      console.log(`Recordatorio enviado a ${org.slug} (${hoursLeft}h restantes)`)
    }
  }
}

// Registrar en BullMQ
export const setupReminderQueue = new Queue('setup-reminder', {
  connection: redis,
  defaultJobOptions: {
    repeat: {
      pattern: '0 * * * *'  // Cada hora
    }
  }
})

setupReminderQueue.process(async () => {
  await sendSetupReminders()
})
```

---

### 5. Frontend: Mostrar Bloqueo de Setup

```typescript
// apps/web/components/setup-required-banner.tsx

export function SetupRequiredBanner({ isSetupBlocked, setupDeadline }: Props) {
  if (!isSetupBlocked) {
    return null  // No mostrar si no está bloqueado
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          ⚠️ Setup Requerido
        </h2>
        
        <p className="text-gray-700 mb-6">
          Tu período de 24 horas para completar el setup ha vencido.
        </p>
        
        <p className="text-gray-600 mb-6">
          <strong>Tu suscripción sigue activa</strong>, pero necesitas completar
          la configuración inicial para acceder al producto.
        </p>
        
        <a
          href="/setup"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-center block"
        >
          Completar Setup Ahora
        </a>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Si tienes dudas, contacta a soporte@apexia.com
        </p>
      </div>
    </div>
  )
}
```

**En layout:**

```typescript
// apps/web/app/(app)/[slug]/layout.tsx

export default function DashboardLayout({ children }: Props) {
  const { organization } = useAuth()
  
  return (
    <>
      <SetupRequiredBanner
        isSetupBlocked={organization?.isSetupBlocked}
        setupDeadline={organization?.setupDeadline}
      />
      
      {/* Dashboard normal */}
      {children}
    </>
  )
}
```

---

## 📧 Emails Requeridos

### Email 1: Pago Confirmado + Setup Requerido

```
Asunto: ¡Bienvenido a Apex IA! Complete setup en 24h

Hola [Organization Name],

¡Gracias por elegir Apex IA! Tu pago ha sido confirmado.

Tienes 24 horas para completar la configuración inicial:
1. Conecta tu base de datos de Supabase
2. Inicializa el schema
3. Conecta al menos un canal (WhatsApp, Instagram, etc.)

[Button: Completar Setup]

Deadline: [Date/Time]

Si no completas el setup en 24h, tu acceso se bloqueará (pero tu suscripción seguirá activa).

Saludos,
Apex IA Team
```

### Email 2: Recordatorio (6h antes)

```
Asunto: ⏰ 6 horas restantes para completar setup

Hola [Organization Name],

Solo te quedan 6 horas para completar la configuración.

[Button: Completar Setup Ahora]

Si necesitas ayuda, contacta a complexa.ia@gmail.com

Saludos,
Apex IA Team
```

### Email 3: Setup Bloqueado (Pasaron 24h)

```
Asunto: ⚠️ Setup requerido para usar Apex IA

Hola [Organization Name],

Tu período de 24 horas ha vencido. Para acceder al producto, necesitas completar el setup.

[Button: Completar Setup Ahora]

Buenas noticias: Tu suscripción sigue activa. Puedes completar el setup cuando estés listo.

Saludos,
Apex IA Team
```

---

## ✅ Resumen de Estados

| Estado | Pasó Setup? | Pasaron 24h? | isSetupBlocked | Acceso | Suscripción |
|--------|-----------|-------------|----------------|--------|------------|
| Recién paga | ❌ | ❌ | false | ✅ Setup | Activa |
| En plazo | ❌ | ❌ | false | ✅ Setup | Activa |
| 6h antes | ❌ | ❌ | false | ✅ Setup + Email | Activa |
| **Timeout** | ❌ | ✅ | **true** | **❌ Bloqueado** | **Activa** |
| Después timeout | ✅ | ✅ | true→false | ✅ Dashboard | Activa |

---

Sigue en `9-SETUP-TIMEOUT-3.md`