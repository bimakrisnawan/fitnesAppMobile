import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { api } from "./api";

export type Tier = "MONTHLY" | "COACHING";
export type Specialization = "RUNNING" | "SWIMMING" | "GENERAL";
export type PaymentStatus = "PENDING" | "SETTLED" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface Plan {
  tier: Tier;
  name: string;
  priceIdr: number;
  description: string;
}

export interface Entitlements {
  library: boolean;
  coaching: boolean;
  activeTiers: Tier[];
  accessUntil: string | null;
}

export interface Payment {
  orderId: string;
  tier: Tier;
  amount: number;
  status: PaymentStatus;
  paymentUrl: string | null;
  expiresAt: string | null;
  periodEnd: string | null;
}

export const formatIdr = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export async function fetchPlans() {
  const { data } = await api.get<{ plans: Plan[] }>("/subscriptions/plans");
  return data.plans;
}

export async function startCheckout(
  input: { tier: Tier; specialization?: Specialization; phone?: string },
  idempotencyKey: string,
) {
  const { data } = await api.post<{ payment: Payment }>("/payments/create", input, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data.payment;
}

export async function fetchPaymentStatus(orderId: string) {
  const { data } = await api.get<{ payment: Payment }>(`/payments/${encodeURIComponent(orderId)}/status`);
  return data.payment;
}

/** Refetches whenever the screen regains focus, e.g. after returning from checkout. */
export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .get<{ entitlements: Entitlements }>("/users/subscription-status")
        .then(({ data }) => active && setEntitlements(data.entitlements))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  return entitlements;
}
