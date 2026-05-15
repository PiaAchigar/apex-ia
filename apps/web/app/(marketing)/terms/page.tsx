import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LandingNavbar } from "@/components/marketing/LandingNavbar";
import { ComplexaFooter } from "@/components/shared/ComplexaFooter";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Complexa CRM",
  description: "Términos y condiciones de uso de Complexa CRM",
};

export default function TermsPage() {
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
            <h1 className="text-4xl font-bold mb-4">Términos y Condiciones</h1>
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
                1. Aceptación de Términos
              </h2>
              <p className="leading-relaxed">
                Al acceder y utilizar Complexa CRM ("Plataforma"), aceptás nuestros
                términos y condiciones. Si no estás de acuerdo con alguna parte de
                estos términos, no deberías usar la Plataforma. Nos reservamos el
                derecho de modificar estos términos en cualquier momento. El uso
                continuado de la Plataforma después de cambios constituye tu aceptación
                de los términos modificados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                2. Descripción del Servicio
              </h2>
              <p className="leading-relaxed">
                Complexa CRM es una plataforma SaaS omnicanal que centraliza mensajes
                de múltiples canales de comunicación (WhatsApp, Instagram, Facebook,
                Telegram, Email, TikTok, WebChat y Voice) en un único inbox. La
                Plataforma incluye automatización visual sin código (Flow Builder),
                pipeline de ventas, analytics y integración con IA (Claude, GPT-4o,
                Gemini).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                3. Cuentas de Usuario
              </h2>
              <p className="leading-relaxed mb-3">
                Para usar Complexa CRM, debes crear una cuenta. Sos responsable de:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Proporcionar información exacta y actualizada durante el registro</li>
                <li>Mantener la confidencialidad de tu contraseña y credenciales</li>
                <li>Todas las actividades que ocurran bajo tu cuenta</li>
                <li>Notificarnos inmediatamente de acceso no autorizado</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                4. Uso Aceptable
              </h2>
              <p className="leading-relaxed mb-3">
                No debes usar Complexa CRM para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Actividades ilegales o que violen leyes locales/internacionales</li>
                <li>Spam, phishing, malware o contenido malicioso</li>
                <li>Acoso, discriminación o contenido abusivo</li>
                <li>Infracciones de derechos de autor, marca o propiedad intelectual</li>
                <li>Intentos de piratería, acceso no autorizado o ataques DDoS</li>
                <li>Venta de datos o credenciales de terceros</li>
                <li>Cualquier cosa que interrumpa el servicio para otros usuarios</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                5. Planes y Precios
              </h2>
              <p className="leading-relaxed mb-3">
                Complexa CRM ofrece tres planes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Starter:</strong> Gratuito, 1 miembro, 3 flows, 2 canales,
                  500 conversaciones/mes
                </li>
                <li>
                  <strong>Growth:</strong> USD 49/mes, 5 miembros, flows ilimitados,
                  10 canales, conversaciones ilimitadas
                </li>
                <li>
                  <strong>Business:</strong> USD 149/mes, miembros ilimitados, todas
                  las features, white-label disponible
                </li>
              </ul>
              <p className="leading-relaxed mt-4">
                Los precios se cobran mensualmente en ciclos de facturación. Podés
                cambiar o cancelar tu plan en cualquier momento desde Settings &gt;
                Billing. El cambio de plan se procesa inmediatamente. Reembolsos no se
                aplican para períodos parciales.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                6. Pagos y Suscripción
              </h2>
              <p className="leading-relaxed">
                Al subscribirte a un plan pagado, autorizás a Complexa CRM a cobrar
                tu método de pago (tarjeta de crédito/débito o Mercado Pago) según tu
                ciclo de facturación. El pago se realiza automáticamente cada mes en la
                misma fecha que tu suscripción. Si un pago falla, intentaremos cobrar
                nuevamente en los próximos días. Si falla permanentemente, podemos
                suspender tu acceso. No reembolsamos por uso parcial del período de
                facturación.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                7. Propiedad Intelectual
              </h2>
              <p className="leading-relaxed mb-3">
                Complexa CRM y su contenido (código, design, features) son propiedad
                intelectual de Complexa IA. Tu acceso está limitado a uso personal o
                comercial según tu plan. No podés:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Copiar, modificar o crear obras derivadas</li>
                <li>Vender, licenciar o transferir acceso a terceros</li>
                <li>Hacer ingeniería inversa del código o infraestructura</li>
                <li>Remover avisos de derechos de autor</li>
              </ul>
              <p className="leading-relaxed mt-4">
                El contenido que cargás (conversaciones, contactos, flows) sigue siendo
                tuyo. Nos otorgás licencia para almacenarlo y procesarlo según lo
                necesario para operar la Plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                8. Limitación de Responsabilidad
              </h2>
              <p className="leading-relaxed mb-3">
                Complexa CRM se proporciona "TAL CUAL" sin garantías de ningún tipo. En
                la medida permitida por ley, no somos responsables por:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Daños indirectos, incidentales, especiales o punitivos</li>
                <li>Pérdida de datos, ganancias o ingresos</li>
                <li>Interrupción del servicio o indisponibilidad</li>
                <li>Errores del usuario o mala configuración</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Nuestra responsabilidad total por cualquier reclamo no superará lo que
                pagaste en los últimos 12 meses en Complexa CRM.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                9. Garantía de Servicio (SLA)
              </h2>
              <p className="leading-relaxed">
                Nos comprometemos a mantener una disponibilidad del 99.9% en la
                Plataforma. El tiempo de inactividad por mantenimiento programado,
                fuerza mayor o factores fuera de nuestro control está excluido. Si no
                cumplimos con el SLA en un mes, podrás solicitar un crédito de cuenta.
                Consulta nuestra página de status (status.complexa.com) para alertas de
                mantenimiento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                10. Suspensión de Cuenta
              </h2>
              <p className="leading-relaxed">
                Nos reservamos el derecho de suspender o terminar tu cuenta si:
                violas estos términos, usas la Plataforma para actividades ilegales,
                incumples pagos, o intentas acceso no autorizado. Intentaremos notificarte
                antes, excepto en casos de violación clara. Tras suspensión, podés perder
                acceso a datos según nuestras políticas de retención.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                11. Datos y Seguridad
              </h2>
              <p className="leading-relaxed">
                Tratamos tus datos con estándares de seguridad industrial (encriptación
                AES-256-GCM, JWT Auth, HTTPS). Sin embargo, ningún sistema es 100%
                seguro. Sos responsable de tu contraseña y credenciales de API. Para
                detalles completos, consulta nuestra Política de Privacidad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                12. Ley Aplicable
              </h2>
              <p className="leading-relaxed">
                Estos términos se rigen por las leyes de Argentina. Cualquier litigio
                estará sujeto a jurisdicción exclusiva de tribunales competentes de
                Buenos Aires, Argentina.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                13. Contacto
              </h2>
              <p className="leading-relaxed">
                Para preguntas sobre estos términos, contáctanos en:
                <br />
                <strong>Email:</strong> support@complexa.com.ar
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
