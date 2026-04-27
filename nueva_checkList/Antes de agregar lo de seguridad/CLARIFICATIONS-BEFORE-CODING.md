# CLARIFICATIONS-BEFORE-CODING.md
## Preguntas a Responder Antes de que Claude Code Toque Una Línea

---

## 1️⃣ Setup Flow: ¿Cuántos Pasos?

**Propuesta actual:** 5 pasos
1. Register → Elegir plan → Confirmar pago (Stripe)
2. Popup: "Conectar Supabase"
3. Validar conexión
4. Ejecutar migraciones
5. Conectar canales (WhatsApp, etc.)

**Pregunta:** ¿Te parece así o preferís menos/más pasos? ¿Quieres que sea todo en UNA página o en varias páginas separadas?

---

## 2️⃣ Validación de Cliente Supabase

**Propuesta:** Cuando el cliente da URL + API Key:
1. Validar formato de URL (debe ser `*.supabase.co`)
2. Intentar conectar (¿puedo leer tablas?)
3. Si falla: mostrar error en el UI
4. Si ok: guardar encriptado

**Pregunta:** ¿Quieres un botón "Verificar Conexión" (cliente lo hace manualmente) o que sea automático al escribir?

---

## 3️⃣ Migraciones en Cliente DB

**Propuesta:** Cuando valida, ejecutar Drizzle migrations automáticamente en su DB.

**Problema:** ¿Qué pasa si el cliente ya tiene tablas con ese nombre? ¿Fallamos o hacemos un check?

**Pregunta:** ¿El cliente puede conectar una Supabase que YA TIENE datos? O ¿siempre es "nueva"?

---

## 4️⃣ ¿Quién Maneja el Schema de Cliente DB?

**Opción A (propuesta actual):** Tú mantienes el schema en `packages/database/schema/` y lo migrás automáticamente en cliente DB
- ✅ Consistencia
- ❌ Si el cliente necesita campos custom, hay que hacer migrations dinámicas

**Opción B:** El cliente maneja su propio schema
- ✅ Flexibilidad
- ❌ Complejidad, potencial para romper cosas

**Pregunta:** ¿Opción A o B?

---

## 5️⃣ Cascada de Borrado

Si un cliente borra su `organization`, ¿qué pasa?

**Opciones:**
- A) Borrar la fila en `client_databases` (él sigue teniendo sus datos en su Supabase)
- B) Intentar borrar TODO de su Supabase (peligroso)
- C) Marcar como "inactive" en lugar de borrar

**Pregunta:** ¿Cuál preferís?

---

## 6️⃣ Encriptación: ¿Quién Genera la Key?

**Propuesta actual:** TÚ generas una única `CLIENT_DB_ENCRYPTION_KEY` y la usás para TODOS los clientes.

**Alternativa:** Generar una key por cliente (más seguro, más complejo).

**Pregunta:** ¿Vale la pena la complejidad extra o la key única está ok?

---

## 7️⃣ Rate Limiting en Setup

¿Cuántos intentos de conexión fallidos permite antes de bloquear?

**Propuesta:** 5 intentos en 15 minutos, luego esperar 1 hora.

**Pregunta:** ¿Ok o cambio?

---

## 8️⃣ ¿Auditar Qué?

**Propuesta:** Registrar en `audit_logs` (MI Supabase):
- `"setup.connect_database"` con `resourceId = organizationId`
- `"setup.database_validation_failed"` con razón del fallo
- `"setup.database_validation_success"`

**Pregunta:** ¿Hay otros eventos que quieras auditar?

---

## 9️⃣ Documentación para Cliente

¿Quieres un modal con instrucciones en el UI?

Algo como:
```
"¿Cómo obtener tu URL y API Key?"

1. Ve a https://app.supabase.com
2. Crea un nuevo proyecto (FREE está ok)
3. Ve a Settings → API
4. Copia la URL
5. Copia la "anon public" key (NO service_role)
6. Pégalas aquí
```

**Pregunta:** ¿Sí? ¿Quieres links a doc oficial de Supabase?

---

## 🔟 API: ¿Public o Private?

Los endpoints de setup (`POST /setup/connect-database`, etc.), ¿deben ser:
- **Public:** accesibles POST-login (el usuario autenticado configura)
- **Private:** solo para admin (es lo lógico)

**Pregunta:** ¿Admin only?

---

## 1️⃣1️⃣ n8n Integration

Mencionaste n8n. ¿Necesitamos hacer algo especial en la Fase 1, o eso viene después?

**Propuesta:** Fase 1 solo configura credenciales de Supabase del cliente. n8n se conecta directamente (él guarda sus credenciales en n8n, no en tu API).

**Pregunta:** ¿Ok? O ¿quieres una tabla en MI DB que linkee workflows n8n a `organizationId`?

---

## 1️⃣2️⃣ Errores de Conexión: ¿Mensajes Específicos?

Si falla la validación, ¿mostrar qué?

**Opciones:**
- A) Genérico: "No se pudo conectar. Verifica URL y Key"
- B) Específico: "Error 401: API Key inválida" o "Error: timeout al conectar"

**Pregunta:** ¿A o B? (B es mejor UX pero expone más info)

---

## 1️⃣3️⃣ Redirect Post-Setup

Después que el cliente completa setup + conecta un canal, ¿redirigir a:
- A) `/[slug]/inbox` (para empezar a usar)
- B) `/[slug]/setup/channels` (si quiere agregar más canales)
- C) `/[slug]/settings/channels` (settings avanzados)

**Pregunta:** ¿A, B o C?

---

## 1️⃣4️⃣ Billing: ¿Ya Pagó?

En el flow:
1. Register
2. Selecciona plan
3. Stripe checkout
4. ¿Webhook confirma pago?
5. Setup

**Pregunta:** ¿El cliente recibe correo confirmando el pago antes de setup? ¿Timeout si no paga en X tiempo?

---

## 1️⃣5️⃣ Fallback si Cliente DB Falla

Si durante el uso normal, la cliente Supabase se cae o se vence la key, ¿qué pasa?

**Opciones:**
- A) Error limpio en el UI: "No se puede conectar a tu DB"
- B) Retry automático (5 veces)
- C) Cache de último estado conocido

**Pregunta:** ¿Cuál preferís?

---

## 📋 Resumen: Escenas de Prueba (QA)

Una vez respondas, voy a armar **test cases**. Por ahora, propongo estos:

1. **Happy path:** Cliente nuevo → Setup completo en 5 min
2. **Bad URL:** Cliente da URL inválida → error claro
3. **Bad Key:** Cliente da key de otro proyecto → error claro
4. **Migration fail:** Algo explota al ejecutar migraciones → rollback?
5. **Timeout:** Conexión tarda >30s → timeout limpio

**Pregunta:** ¿Hay otro scenario que te preocupe?

---

## 🎬 Acción: Responde Todas

Por favor, contesta las 15 preguntas en este formato:

```
1. [TU RESPUESTA]
2. [TU RESPUESTA]
3. ...
```

Una vez tengas esto, voy a:
1. Actualizar `ARCHITECTURE-CHANGES.md` con tus respuestas
2. Preparar `fase-1.md` detallada para Claude Code
3. **Entonces sí** Claude Code empieza a codear sin ambigüedades
