📋 Qué incluí en el seed de Piu Bella
1. Los 3 Pipelines de Belleza
✓ Prospección & Nuevos Clientes (6 stages): Prospect → Lead cualificado → Consulta agendada → 1ra sesión → Cliente convertido → No convertido

✓ Retención & Reactivación (5 stages): Activo → En riesgo → Campaña enviada → Reactivado → Dormido

✓ Paquetes & Membresías (6 stages): Interesado → Propuesta → Negociación → Paquete activo → Completado → Cancelado

2. Custom Fields Personalizados (10 campos)

- Para Contacts:

  - Tipo de piel (Seca, Grasa, Mixta, Normal, Sensible)
  - Alergias a productos
  - Servicios preferidos (Masaje, Facial, Pilates, Aparatología, etc.)
  - Día ideal próxima sesión
  - Frecuencia preferida (1x semanal, 2x semanal, mensual)
  - Cumpleaños (para campaigns de B-day)

- Para Deals:

  - Tipo de paquete (6 sesiones, 12, membresía, etc.)
  - Sesiones restantes (tracking de uso)
  - Fecha inicio tratamiento
  - Tipo de tratamiento (Facial, Masaje, Combo)
  - Método de pago

----------

3. Datos de Ejemplo Realistas

- 5 Contactos con historias diferentes:

María García (cliente VIP activo, frecuente)
Sofia Rodriguez (prospect, primera consulta)
Laura Martínez (cliente dormido - reactivar)
Carolina López (cliente activo con paquete)
Valentina Perez (prospect frío)


- Conversaciones reales:

Consultas sobre horarios
Confirmaciones de citas
Campañas de reactivación
Upsells de servicios


- Deals distribuidos:

Sofia en "Lead cualificado" ($200)
Valentina en "Prospect" ($0)
María en "Cliente activo" ($600)
Laura en "En riesgo de inactividad"
Carolina con "Paquete activo 12 sesiones" ($900)

------

4. Tasks de Seguimiento:
Llamada a Laura para reactivarla (alta prioridad)
Confirmar cita con Sofia
Follow-up con Valentina

-----

5. Campañas de Marketing
✓ Reactivación (15% desc) - dirigida a clientes dormidos

✓ Promoción Paquete VIP - clientes activos

✓ Recordatorio de citas (48hs) - automatizado

----- 

6. Templates de WhatsApp Pre-aprobados (5):
1 - Confirmación de cita ← más importante
2 - Recordatorio 24hs
3 - Agradecimiento post-sesión (a la tardecita, con recomendaciones de "crema" si es necesario)
4 - Oferta de paquete (pending aprobación)
5 - Felicidades cumpleaños (con 20% desc)


---- 

💡 Personalizaciones que agregué (más allá de lo que pediste)
Colores de stages realistas para belleza (grises para frío, azul para movimiento, naranja para decisión, purple para transición, verde para ganado, rojo para pérdida)

UUIDs fijos para los pipelines y stages (así en la documentación/testing se pueden referenciar siempre igual)

Custom fields anidados en JSON → en custom_fields_json del contact está: tipo de piel, alergias, servicios, etc. Así ya está la estructura lista para el frontend

Nombres en español latino (María, Sofia, Laura) con teléfonos argentinos (+54 9 11...) — adaptado al mercado

Templates de WhatsApp con variables (ej: {NOMBRE}, {HORA}, {FECHA}) — listo para interpolación en la app

Tags realistas en contacts: cliente_activo, prospect, cliente_dormido, vip, primera_consulta — sirven para filtros

Timestamps relativos en conversaciones (NOW(), NOW() - INTERVAL) — así los datos simulan ser de los últimos días, no son estáticos

🚀 Cómo usarlo
Cuando Piu Bella (u otro cliente de belleza) complete el setup y conecte su Supabase, en lugar de ejecutar 0001_client_schema.sql, ejecutarías 0001_client_schema_piu_bella.sql y tendría toda la estructura + datos listos para demostración/testing.


¿Te gustaría que cree más templates de seed para otros tipos de negocio (consultorio médico, gym, peluquería, etc.)?