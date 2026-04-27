"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBillingStatus } from "../../../../../hooks/useBillingStatus";
import { PLAN_PRICES, PLAN_FEATURES } from "@apex-ia/utils/billing";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Badge } from "../../../../../components/ui/badge";
import { Loader2, Check } from "lucide-react";

export default function BillingPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading, refetch } = useBillingStatus();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!data) {
    return <div>Error loading billing information</div>;
  }

  const handleSubscribe = async (planId: "growth" | "business") => {
    try {
      setSubscribingTo(planId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const result = (await response.json()) as { success: boolean; data: { checkoutUrl: string } };

      if (result.success && result.data.checkoutUrl) {
        // Redirect to Mercado Pago checkout
        window.location.href = result.data.checkoutUrl;
      }
    } catch (err) {
      console.error("Error subscribing:", err);
      setSubscribingTo(null);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm("¿Estás seguro de que querés cancelar tu suscripción?")) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/subscription`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (response.ok) {
        await refetch();
      }
    } catch (err) {
      console.error("Error cancelling subscription:", err);
    }
  };

  const showSuccess = searchParams.get("success") === "true";

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-gray-600 mt-2">Gestiona tu plan y suscripción</p>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          ✓ ¡Suscripción activada! Tu plan se ha actualizado.
        </div>
      )}

      {/* Current Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle>Plan actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">{data.plan}</p>
              {data.trialStatus.isActive && (
                <p className="text-sm text-gray-600">
                  Trial activo - {data.trialStatus.daysLeft} días restantes
                </p>
              )}
            </div>
            {data.subscription && data.subscription.status === "active" && (
              <Badge className="bg-emerald-500">Activo</Badge>
            )}
          </div>

          {data.subscription && (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Período:</strong>{" "}
                {data.subscription.billingPeriod === "annual" ? "Anual" : "Mensual"}
              </p>
              {data.subscription.periodEnd && (
                <p>
                  <strong>Próxima facturación:</strong>{" "}
                  {new Date(data.subscription.periodEnd).toLocaleDateString("es-AR")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Period Toggle */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium">Período de facturación:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-emerald-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              billingPeriod === "annual"
                ? "bg-emerald-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Anual
            {billingPeriod === "annual" && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                Ahorra 2 meses
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Starter */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>Plan gratuito</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold">Gratis</p>
              <p className="text-sm text-gray-600">Para siempre</p>
            </div>

            {data.plan === "starter" && (
              <Badge className="w-full text-center justify-center bg-emerald-500">
                Plan actual
              </Badge>
            )}

            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.starter.flows} flows</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.starter.channels} canales</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.starter.conversations} conversaciones</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.starter.team_members} miembro de equipo</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Growth */}
        <Card className="border-emerald-500 shadow-lg">
          <CardHeader>
            <CardTitle>Growth</CardTitle>
            <CardDescription>Más potencia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold">
                ${PLAN_PRICES.growth[billingPeriod]}{" "}
                <span className="text-lg text-gray-600 font-normal">
                  {billingPeriod === "annual" ? "/año" : "/mes"}
                </span>
              </p>
              {billingPeriod === "annual" && (
                <p className="text-xs text-emerald-600 mt-1">2 meses gratis (vs mensual)</p>
              )}
            </div>

            {data.plan === "growth" && data.subscription?.status === "active" ? (
              <>
                <Badge className="w-full text-center justify-center bg-emerald-500">
                  Plan actual
                </Badge>
                <Button
                  onClick={handleUnsubscribe}
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50"
                >
                  Cancelar suscripción
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSubscribe("growth")}
                disabled={subscribingTo === "growth"}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {subscribingTo === "growth" ? "Procesando..." : "Suscribirse"}
              </Button>
            )}

            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.growth.flows} flows</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.growth.channels} canales</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.growth.conversations} conversaciones</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.growth.team_members} miembros de equipo</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Business */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Business</CardTitle>
            <CardDescription>Escala tu negocio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-bold">
                ${PLAN_PRICES.business[billingPeriod]}{" "}
                <span className="text-lg text-gray-600 font-normal">
                  {billingPeriod === "annual" ? "/año" : "/mes"}
                </span>
              </p>
              {billingPeriod === "annual" && (
                <p className="text-xs text-emerald-600 mt-1">2 meses gratis (vs mensual)</p>
              )}
            </div>

            {data.plan === "business" && data.subscription?.status === "active" ? (
              <>
                <Badge className="w-full text-center justify-center bg-emerald-500">
                  Plan actual
                </Badge>
                <Button
                  onClick={handleUnsubscribe}
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50"
                >
                  Cancelar suscripción
                </Button>
              </>
            ) : (
              <Button
                onClick={() => handleSubscribe("business")}
                disabled={subscribingTo === "business"}
                className="w-full bg-emerald-500 hover:bg-emerald-600"
              >
                {subscribingTo === "business" ? "Procesando..." : "Suscribirse"}
              </Button>
            )}

            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.business.flows} flows</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.business.channels} canales</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{PLAN_FEATURES.business.conversations} conversaciones</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Equipo ilimitado</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {data.paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Fecha</th>
                    <th className="text-left py-2 px-2">Monto</th>
                    <th className="text-left py-2 px-2">Estado</th>
                    <th className="text-left py-2 px-2">ID Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {data.paymentHistory.map((payment) => (
                    <tr key={payment.id} className="border-b">
                      <td className="py-2 px-2">
                        {payment.paidAt && new Date(payment.paidAt).toLocaleDateString("es-AR")}
                      </td>
                      <td className="py-2 px-2">${(payment.amount / 100).toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={payment.status === "paid" ? "default" : "secondary"}
                          className={
                            payment.status === "paid" ? "bg-emerald-500" : "bg-gray-400"
                          }
                        >
                          {payment.status === "paid" ? "Pagado" : payment.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-gray-600 text-xs font-mono">
                        {payment.providerPaymentId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
