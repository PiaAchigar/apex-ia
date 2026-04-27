1️⃣ PIPELINE: Prospección & Nuevos Clientes
Objetivo: Convertir prospects en clientes que agendaron su primera sesión

Stage	Qué pasa	Duración típica
Prospect	Alguien se entera de ti (ad, referencia, búsqueda)	1-7 días
Lead cualificado	Dejó contacto + mostró interés claro	2-3 días
Consulta agendada	Tiene cita confirmada en el calendario	3-10 días
1ra sesión realizada	Vino, hizo la sesión	1 día
✓ Cliente convertido	Agendó sesión 2 (es cliente recurrente)	-
✗ No convertido	Fue pero nunca volvió a agendar	-
3 Ejemplos prácticos:
Ejemplo 1: María (Instagram Ads)


1. María ve ad de Piu Bella en Instagram
   → Stage: PROSPECT (deal creado automático o manual)
   → Monto: $0 | Probabilidad: 30%

2. María hace click, llena el form "Quiero facial"
   → Stage: LEAD CUALIFICADO
   → Monto: $150 (estimado de sesión) | Probabilidad: 60%

3. Agenta vía WhatsApp le dice "Tengo horario mañana 3pm"
   → Stage: CONSULTA AGENDADA
   → Monto: $150 | Probabilidad: 85%

4. María viene mañana, hace el facial
   → Stage: 1RA SESIÓN REALIZADA
   → Monto: $150 | Probabilidad: 90%

5. Agenta le dice "¿Cuándo quieres venir la próxima?"
   → Stage: CLIENTE CONVERTIDO ✓
   → Monto: $150 | Cerrada (ganada)
Ejemplo 2: Sofia (Referida por amiga)


1. Sofia llama diciendo "Me recomendó María"
   → Stage: PROSPECT
   → Monto: $0 | Probabilidad: 50% (referida = mejor %!)

2. Responde WhatsApp con entusiasmo
   → Stage: LEAD CUALIFICADO
   → Monto: $200 (combo: masaje + facial) | Probabilidad: 75%

3. Se agenda para el sábado 5pm
   → Stage: CONSULTA AGENDADA
   → Monto: $200 | Probabilidad: 90%

4. Asiste y disfruta mucho
   → Stage: 1RA SESIÓN REALIZADA
   → Monto: $200 | Probabilidad: 95%

5. Agenta le vende paquete 6 sesiones
   → Stage: CLIENTE CONVERTIDO ✓ (+ Pasa a Pipeline 3)
Ejemplo 3: Valentina (Google Maps)


1. Valentina busca "spa cerca de mí", ve Piu Bella en Maps
   → Stage: PROSPECT
   → Monto: $0 | Probabilidad: 20% (search = bajo engagement inicial)

2. Manda WhatsApp pero responde lentamente
   → Stage: LEAD CUALIFICADO
   → Monto: $150 | Probabilidad: 40%

3. Agenta ofrece 2 horarios, Valentina dice "Déjame pensarlo"
   → Stage: CONSULTA AGENDADA (tentativa)
   → Monto: $150 | Probabilidad: 50%

4. Valentina cancela a último momento
   → Stage: NO CONVERTIDO ✗
   → Deal cerrada como "perdida"
2️⃣ PIPELINE: Retención & Reactivación
Objetivo: Mantener clientes activos + traer de vuelta clientes que desaparecieron

Stage	Qué pasa	Acción
Activo	Vino en últimas 2 semanas	Mantener relación
En riesgo	No vino hace 30+ días	Alertar + actuar
Campaña enviada	Mandaste WhatsApp/email con oferta	Esperar respuesta
Reactivado	Volvió a agendar	Cerrar ganada
Dormido	60+ días sin venir	Archivo (o retry anual)
3 Ejemplos prácticos:
Ejemplo 1: María (Cliente VIP Activo)


1. María vino hace 5 días a masaje relajante
   → Stage: ACTIVO (últimas 2 sem)
   → Monto: $600 (valor anual estimado) | Probabilidad: 95%

2. Sistema automático: Martes próximo cumplen 15 días sin venir
   → Trigger n8n: "Enviar recordatorio si casi llega a 30 días"
   → WhatsApp: "¡Hola María! Te queda 1 sesión del paquete. ¿Agendamos?"

3. María responde "Sí! Mañana 4pm"
   → Stay en ACTIVO (o se refresca la fecha)
   → Monto: $600 | Probabilidad: 95%
Ejemplo 2: Laura (Cliente Dormido → Reactivación)


1. Laura vino hace 40 días (última sesión: masaje)
   → Stage: EN RIESGO (30+ días sin venir)
   → Monto: $400 | Probabilidad: 40%

2. Agenta manda campaña WhatsApp:
   "Laura, te echamos de menos 💆‍♀️ Volvé con 15% desc. ¿Agendamos?"
   → Stage: CAMPAÑA ENVIADA
   → Monto: $340 (con desc 15%) | Probabilidad: 55%

3. Laura responde "Sí! Estuve ocupada pero quiero volver"
   → Stage: REACTIVADO ✓
   → Deal cerrada como "ganada"
   → Se mueve también a Pipeline 3 (Paquete activo) si compra

4. Si Laura no responde en 7 días:
   → Pasa automáticamente a DORMIDO (60+ días sin respuesta)
   → Deal cerrada como "perdida"
Ejemplo 3: Carolina (Reactivación con Incentivo)


1. Carolina no vino hace 45 días
   → Stage: EN RIESGO
   → Monto: $500 | Probabilidad: 35%

2. Mandas campaña especial: "Membresía anual: ilimitado por $2.999"
   → Stage: CAMPAÑA ENVIADA
   → Monto: $2.999 | Probabilidad: 50%

3. Carolina responde "Cuéntame más"
   → Agenta: Zoom call/video con beneficios
   → Carolina compra membresía anual
   → Stage: REACTIVADO + PAQUETE ACTIVO ✓
3️⃣ PIPELINE: Paquetes & Membresías
Objetivo: Convertir clientes one-time en clientes recurring (paquetes o membresías)

Stage	Qué pasa	Acción
Interesado	Cliente pregunta por paquetes	Mostrar opciones
Propuesta	Enviaste cotización + beneficios	Esperar decisión
Negociación	"¿Puedo en 2 cuotas?"	Negociar términos
Paquete activo	Compró, está usando sesiones	Usar + upsell
Completado	Usó todas las sesiones	Renovar o adiós
Cancelado	Pidió reembolso o se arrepintió	Análisis de churn
3 Ejemplos prácticos:
Ejemplo 1: Carolina (Paquete 12 sesiones)


1. Carolina vino 3 veces a sesiones individuales ($150 c/u)
   → Costo total: $450
   → Agenta: "¿Viste que hay paquete 12 sesiones a $900?"
   → Stage: INTERESADO
   → Monto: $900 | Probabilidad: 70%

2. Agenta manda WhatsApp con detalle:
   "12 sesiones x $900 = $75/sesión (vs $150)
    + acceso a área VIP + 10% en productos
    Vigencia: 6 meses"
   → Stage: PROPUESTA PRESENTADA
   → Monto: $900 | Probabilidad: 75%

3. Carolina: "¿Puedo en 2 cuotas de $450?"
   → Agenta: "Dale! Primera cuota ahora, segunda en 2 semanas"
   → Stage: NEGOCIACIÓN
   → Monto: $900 | Probabilidad: 85%

4. Carolina paga, recibe acceso + cronograma
   → Stage: PAQUETE ACTIVO
   → Monto: $900 | Probabilidad: 95%
   → Custom field: "sessions_remaining": 12

5. 3 meses después: Carolina usó 8 sesiones
   → Trigger n8n: "¿Quieres renovar? Quedan 4 sesiones"
   → Si renueva: vuelve a PAQUETE ACTIVO con 12 nuevas
   → Si no: Stage COMPLETADO (deal cerrada)
Ejemplo 2: Sofia (Membresía Mensual)


1. Sofia vino 4 veces en 1 mes
   → Costo: $600 en sesiones individuales
   → Agenta: "Te sale más barato con membresía"
   → Stage: INTERESADO
   → Monto: $399 (membresía ilimitada/mes) | Probabilidad: 65%

2. Propuesta: "Membresía: ilimitado por $399/mes, cancel cuando quieras"
   → Stage: PROPUESTA PRESENTADA
   → Monto: $399 | Probabilidad: 75%

3. Sofia negocia: "¿Puedo pagar trimestral con desc?"
   → Acuerdo: $350/mes si paga 3 meses adelantado
   → Stage: NEGOCIACIÓN → PAQUETE ACTIVO
   → Monto: $1.050 (3 meses) | Probability: 90%

4. Sofia viene 2-3 veces/semana, disfruta
   → Monto actualizado a valor anual: $4.200
   → LTV muy alto → VIP tag
Ejemplo 3: Valentina (Abandono de paquete)


1. Valentina compra paquete 6 sesiones x $900
   → Stage: PAQUETE ACTIVO
   → Monto: $900 | Sessions_remaining: 6

2. Usa 2 sesiones, luego desaparece (45 días sin venir)
   → n8n trigger: "Cliente con paquete activo + sin uso 30+ días"
   → Stage: PAQUETE ACTIVO (pero en riesgo)
   → Campaña: "Valentina, quedan 4 sesiones! ¿Agendamos?"

3. Valentina pide reembolso de las 4 sesiones no usadas
   → Stage: CANCELADO
   → Deal cerrada como "perdida"
   → Custom field: "cancellation_reason": "Reembolso solicitado"
   → Analysis: ¿Fue mala experiencia? ¿Falta de tiempo?
4️⃣ ¿Se pueden usar en paralelo?
¡SÍ, completamente! Un mismo cliente puede estar en múltiples pipelines simultáneamente.

Ejemplo: Carolina en los 3 pipelines

PIPELINE 1: Prospección & Nuevos Clientes
├─ Stage: ✓ CLIENTE CONVERTIDO
└─ Monto: $150 (sesión inicial)

PIPELINE 2: Retención & Reactivación
├─ Stage: ACTIVO (última sesión hace 4 días)
└─ Monto: $600 (valor que genera/mes)

PIPELINE 3: Paquetes & Membresías
├─ Stage: PAQUETE ACTIVO
└─ Monto: $900 (paquete 12 sesiones)
Así funciona:

Carolina entra como prospect → P1
Se convierte → P1: Cliente convertido
Continúa activa → P2: Activo
Compra paquete → P3: Paquete activo
Si se duerme → P2 cambia a "En riesgo", P3 se pausa
Si reactivamos → P2: Reactivado, P3: Paquete activo again
Nota: Los deals son independientes. Una deal por pipeline. La contact_id es la misma, pero cada deal tiene su propia pipeline_id.

5️⃣ ¿Puedo modificarlos desde n8n o Python?
¡SÍ! 100% automatizable.

Opción A: Desde n8n

Trigger: WhatsApp message
↓
Condition: "Contiene 'agendar'"
↓
Fetch Contact (by phone)
↓
Create/Update Deal
├─ pipeline_id: 'a1111111...' (Prospección)
├─ stage_id: (Consulta agendada)
├─ contact_id: (la que vino del fetch)
├─ title: "María - Facial + masaje"
└─ amount: 200
↓
Send WhatsApp: "Confirmado para mañana 3pm!"
Opción B: Desde Python

import requests

# 1. Crear un deal en Pipeline Prospección
url = "http://localhost:3000/api/deals"
payload = {
    "contact_id": "c1111111-1111-1111-1111-111111111111",
    "pipeline_id": "a1111111-1111-1111-1111-111111111111",  # Prospección
    "stage_id": "stage-uuid-consulta-agendada",
    "title": "María - Facial con aparatología",
    "amount": 250,
    "probability": 85
}
response = requests.post(url, json=payload, headers={"Authorization": "Bearer JWT_TOKEN"})
deal = response.json()["data"]

# 2. Mover a siguiente stage (después de sesión realizada)
url_update = f"http://localhost:3000/api/deals/{deal['id']}"
payload_update = {
    "stage_id": "stage-uuid-cliente-convertido",
    "probability": 100
}
requests.put(url_update, json=payload_update, headers={"Authorization": "Bearer JWT_TOKEN"})

# 3. Crear deal en Pipeline Paquetes cuando compra
payload_package = {
    "contact_id": "c1111111-1111-1111-1111-111111111111",
    "pipeline_id": "a3333333-3333-3333-3333-333333333333",  # Paquetes
    "stage_id": "stage-uuid-paquete-activo",
    "title": "María - Paquete 12 sesiones",
    "amount": 900
}
requests.post(url, json=payload_package, headers={"Authorization": "Bearer JWT_TOKEN"})
Ejemplo real: Automatizar reactivación con n8n

Cron Trigger: Cada 24hs
↓
Query: SELECT contacts WHERE last_session < 30 days AGO AND no active deal in P2
↓
For each contact:
  ├─ Create Deal in Pipeline Retención (stage: EN RIESGO)
  ├─ Send WhatsApp: "Hola {name}, te echamos de menos..."
  └─ Set task: "Seguimiento en 3 días"
Ejemplo real: Auto-pasar stages con Python + scheduled job

# Cron job: cada 6 horas
def move_staged_deals():
    # Deals que pasaron 5 días en "Consulta agendada"
    old_staged = db.query(Deal).filter(
        Deal.stage_id == "consulta-agendada",
        Deal.updated_at < now() - timedelta(days=5)
    )
    
    for deal in old_staged:
        # ¿Vino a la sesión? (check contact's last message o calendar)
        if contact_attended_session(deal.contact_id):
            move_deal_to_stage(deal.id, "1ra-sesion-realizada")
        else:
            # Desapareció → No convertido
            move_deal_to_stage(deal.id, "no-convertido")
📊 Resumen: Cómo usan los pipelines juntos

CLIENTE NUEVO (semana 1)
├─ P1: Prospect → Lead → Consulta agendada → 1ra sesión → Cliente convertido ✓
└─ P2: (no aplica aún)

CLIENTE ACTIVO (semana 2-8)
├─ P1: Cliente convertido (cerrada)
├─ P2: ACTIVO (monitoreando)
└─ Agenta vende paquete...

CLIENTE CON PAQUETE (semana 3)
├─ P1: Cliente convertido (cerrada)
├─ P2: ACTIVO
└─ P3: Paquete activo (4/12 sesiones usadas)

CLIENTE DORMIDO (día 45)
├─ P1: Cliente convertido (cerrada)
├─ P2: EN RIESGO → Campaña enviada → Reactivado ✓
└─ P3: Paquete activo (2/12 sesiones, vencido?)
¿Te queda claro? ¿Querés que arme un ejemplo específico de automatización que vos tengas en mente?



 
