import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LandingNavbar } from "@/components/marketing/LandingNavbar";
import { ComplexaFooter } from "@/components/shared/ComplexaFooter";

export const metadata: Metadata = {
  title: "Política de Privacidad — Complexa CRM",
  description: "Política de privacidad de Complexa CRM",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-[#F9FAFB] flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-[#374151] py-12 px-4">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a inicio
            </Link>
            <h1 className="text-4xl font-bold mb-4">Política de Privacidad</h1>
            <p className="text-gray-400">
              Última actualización: {new Date().toLocaleDateString("es-AR")}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="py-16 px-4">
          <div className="mx-auto max-w-3xl space-y-8 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                1. Introducción
              </h2>
              <p className="leading-relaxed">
                En Complexa CRM, respetamos tu privacidad y nos comprometemos a
                proteger tus datos personales. Esta Política de Privacidad explica qué
                información recopilamos, cómo la usamos, cómo la protegemos y tus
                derechos con respecto a tus datos. Si tienes preguntas, contáctanos en
                privacy@complexa.com.ar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                2. Información que Recopilamos
              </h2>
              <p className="leading-relaxed mb-3">
                Recopilamos información en diferentes categorías:
              </p>
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                2.1 Información de Cuenta
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Nombre, email, contraseña (hasheada)</li>
                <li>Nombre de la organización/empresa</li>
                <li>Número de teléfono (opcional)</li>
                <li>Ubicación/país</li>
              </ul>

              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                2.2 Información Operacional
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Conversaciones de mensajería (WhatsApp, IG, FB, etc.)</li>
                <li>Contactos y datos de clientes (con tu consentimiento)</li>
                <li>Flujos de automatización configurados</li>
                <li>Datos de pipeline y transacciones</li>
                <li>Campos personalizados que creas</li>
              </ul>

              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                2.3 Información Técnica
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Dirección IP</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Páginas visitadas, duración de sesión</li>
                <li>Cookies y identificadores similares</li>
                <li>Logs de acceso y actividad</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                3. Cómo Usamos tu Información
              </h2>
              <p className="leading-relaxed mb-3">
                Utilizamos tu información para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Proporcionar el servicio:</strong> Almacenar y procesar tus
                  conversaciones, contactos, flows y datos operacionales
                </li>
                <li>
                  <strong>Mejorar la plataforma:</strong> Entender cómo se usa Complexa
                  CRM, identificar bugs, desarrollar features
                </li>
                <li>
                  <strong>Comunicaciones:</strong> Enviarte actualizaciones, notificaciones
                  de seguridad, cambios de términos
                </li>
                <li>
                  <strong>Marketing (con consentimiento):</strong> Newsletters y ofertas
                  especiales (podés desuscribirte en cualquier momento)
                </li>
                <li>
                  <strong>Cumplimiento legal:</strong> Responder requerimientos legales,
                  prevenir fraude, asegurar términos de servicio
                </li>
                <li>
                  <strong>Analytics:</strong> Agregamos datos para entender tendencias,
                  no individualmente
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                4. Base Legal para el Procesamiento
              </h2>
              <p className="leading-relaxed">
                Procesamos tu información basados en: (a) tu consentimiento explícito
                al crear cuenta; (b) ejecución del contrato de servicio; (c) obligaciones
                legales; (d) interés legítimo en mejorar nuestro servicio y proteger
                seguridad. Podés retirar consentimiento en cualquier momento contactando
                privacy@complexa.com.ar, aunque algunos datos pueden ser requeridos por ley.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                5. Seguridad de Datos
              </h2>
              <p className="leading-relaxed mb-3">
                Implementamos medidas de seguridad técnicas, administrativas y físicas:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Encriptación:</strong> AES-256-GCM en reposo, TLS 1.2+ en
                  tránsito
                </li>
                <li>
                  <strong>Autenticación:</strong> JWT tokens, contraseñas hasheadas con
                  bcrypt
                </li>
                <li>
                  <strong>Aislamiento de datos:</strong> Schema-per-tenant, datos de
                  clientes en Supabase separado
                </li>
                <li>
                  <strong>Acceso restringido:</strong> Solo personal autorizado con
                  necesidad empresarial
                </li>
                <li>
                  <strong>Auditoría:</strong> Logs de acceso, cambios de datos
                </li>
                <li>
                  <strong>Backups:</strong> Automáticos, encriptados, almacenados
                  geográficamente distribuidos
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                Sin embargo, ningún sistema es 100% seguro. No podemos garantizar
                seguridad absoluta. Reporta vulnerabilidades a security@complexa.com.ar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                6. Retención de Datos
              </h2>
              <p className="leading-relaxed">
                Retenemos tu información mientras tu cuenta esté activa. Si cancelas,
                podemos retener datos agregados/anonimizados para analytics. Los datos
                personales se eliminarán dentro de 30 días (excepto si ley requiere
                retención más larga). Conversaciones se mantienen según tu configuración
                de backup. Podés solicitar eliminación en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                7. Compartir Información
              </h2>
              <p className="leading-relaxed mb-3">
                Compartimos información solo cuando es necesario:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Proveedores de servicios:</strong> Supabase (DB), Vercel/Railway
                  (hosting), Stripe (pagos), Resend (emails), Sentry (errores)
                </li>
                <li>
                  <strong>Integraciones de IA:</strong> Anthropic, OpenAI, Google (solo si
                  configuras AI credentials)
                </li>
                <li>
                  <strong>Canales de mensajería:</strong> Meta, Telegram, TikTok (solo datos
                  necesarios para funcionar)
                </li>
                <li>
                  <strong>Requerimientos legales:</strong> Autoridades si ley lo requiere
                  (intentaremos notificarte primero)
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                Todos los proveedores tienen acuerdos de procesamiento de datos (DPA) que
                requieren protección equivalente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                8. Tus Derechos
              </h2>
              <p className="leading-relaxed mb-3">
                Tenés derechos sobre tus datos:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Acceso:</strong> Solicitar copia de datos que procesamos
                </li>
                <li>
                  <strong>Rectificación:</strong> Corregir información incorrecta
                </li>
                <li>
                  <strong>Eliminación:</strong> Solicitar borrado ("derecho al olvido")
                </li>
                <li>
                  <strong>Portabilidad:</strong> Descargar datos en formato estándar
                </li>
                <li>
                  <strong>Restricción:</strong> Limitar uso de tus datos
                </li>
                <li>
                  <strong>Objeción:</strong> Objetar procesamiento, especialmente marketing
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                Para ejercer derechos, contacta privacy@complexa.com.ar con identificación.
                Responderemos en 30 días. Si no estás satisfecho, podés contactar a tu
                autoridad de protección de datos local.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                9. Cookies y Rastreo
              </h2>
              <p className="leading-relaxed">
                Usamos cookies y tecnología similar para: mantener sesiones, recordar
                preferencias, entender uso de la plataforma. Podés controlar cookies en
                tu navegador. Las cookies no almacenan información personal sensible.
                Google Analytics se usa de forma anonimizada. No usamos cookies de
                terceros para publicidad dirigida.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                10. Transferencias Internacionales
              </h2>
              <p className="leading-relaxed">
                Tu información se procesa principalmente en servidores de Buenos Aires
                (Argentina) e infraestructura de Supabase (USA). Si eres ciudadano de
                Europa/EEA, Supabase tiene certificaciones SCCs (Standard Contractual
                Clauses) para transferencias legales. Transferencias internacionales
                ocurren solo con mecanismos legales adecuados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                11. Datos de Menores
              </h2>
              <p className="leading-relaxed">
                Complexa CRM no está dirigida a menores de 18 años. No recopilamos
                intencionalmente información de menores. Si descubrimos que procesamos
                datos de menor sin consentimiento parental, eliminaremos esa información.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                12. Cambios a esta Política
              </h2>
              <p className="leading-relaxed">
                Podemos actualizar esta Política periódicamente. Cambios significativos
                te serán notificados por email o prominentemente en la Plataforma. El uso
                continuado constituye aceptación. Fecha de última actualización está al
                inicio de este documento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                13. Contacto
              </h2>
              <p className="leading-relaxed">
                Para privacidad, solicitudes ARCO, o preguntas:
                <br />
                <strong>Email:</strong> privacy@complexa.com.ar
                <br />
                <strong>Dirección:</strong> Buenos Aires, Argentina
                <br />
                <strong>Web:</strong> www.complexa.com.ar
              </p>
            </section>
          </div>
        </div>
      </main>

      <ComplexaFooter />
    </div>
  );
}
