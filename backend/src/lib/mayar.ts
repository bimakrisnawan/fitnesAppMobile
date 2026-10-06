// Thin client for the Mayar Headless API (https://docs.mayar.id/api-reference/introduction).
// Only the invoice endpoints are used: an invoice gives us an id to reconcile against,
// while the bare "dynamic QR" endpoint returns just an image with no id.
import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";
import { mockMayar } from "./mayar-mock.js";

const TIMEOUT_MS = 10_000;

const envelope = <T extends z.ZodType>(data: T) => z.object({ statusCode: z.number(), data });

const createdInvoiceSchema = envelope(
  z.object({
    id: z.string(),
    transactionId: z.string().optional(),
    link: z.string(),
    expiredAt: z.number().optional(), // epoch ms
  }),
);

const invoiceDetailSchema = envelope(
  z.object({
    id: z.string(),
    status: z.string(), // "unpaid" | "paid" | "closed" … (not fully documented)
    amount: z.number(),
    transactionId: z.string().nullish(),
    expiredAt: z.number().nullish(),
  }),
);

export interface CreateInvoiceInput {
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  description: string;
  amount: number;
  expiresAt: Date;
  redirectUrl: string;
  /** Echoed back by Mayar; we use it to carry our own ids. */
  reference: { userId: string; paymentId: string };
}

export interface CreatedInvoice {
  invoiceId: string;
  transactionId: string | null;
  paymentUrl: string;
  expiresAt: Date | null;
}

export interface InvoiceStatus {
  invoiceId: string;
  amount: number;
  paid: boolean;
  closed: boolean;
  rawStatus: string;
}

export class MayarError extends HttpError {
  constructor(message: string) {
    super(502, message, "PAYMENT_PROVIDER_ERROR");
  }
}

async function call<T extends z.ZodType>(method: "GET" | "POST", path: string, schema: T, body?: unknown) {
  if (!env.MAYAR_API_KEY) throw new HttpError(503, "Payments are not configured", "PAYMENTS_DISABLED");

  let res: Response;
  try {
    res = await fetch(`${env.MAYAR_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${env.MAYAR_API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new MayarError(`Mayar unreachable: ${(err as Error).message}`);
  }

  const text = await res.text();
  if (!res.ok) throw new MayarError(`Mayar ${method} ${path} failed with ${res.status}: ${text.slice(0, 300)}`);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new MayarError(`Mayar returned non-JSON for ${path}: ${text.slice(0, 300)}`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new MayarError(`Unexpected Mayar response for ${path}: ${text.slice(0, 300)}`);
  return parsed.data as z.infer<T>;
}

const mayarApi = {
  async createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
    const { data } = await call("POST", "/invoice/create", createdInvoiceSchema, {
      name: input.customerName,
      email: input.customerEmail,
      mobile: input.customerMobile,
      redirectUrl: input.redirectUrl,
      description: input.description,
      expiredAt: input.expiresAt.toISOString(),
      items: [{ quantity: 1, rate: input.amount, description: input.description }],
      extraData: { noCustomer: input.reference.userId, idProd: input.reference.paymentId },
    });
    return {
      invoiceId: data.id,
      transactionId: data.transactionId ?? null,
      paymentUrl: data.link,
      expiresAt: data.expiredAt ? new Date(data.expiredAt) : null,
    };
  },

  /** Source of truth for whether an invoice was paid. Webhook bodies are never trusted on their own. */
  async getInvoice(invoiceId: string): Promise<InvoiceStatus> {
    const { data } = await call("GET", `/invoice/${encodeURIComponent(invoiceId)}`, invoiceDetailSchema);
    const status = data.status.toLowerCase();
    return {
      invoiceId: data.id,
      amount: data.amount,
      paid: status === "paid" || status === "success" || status === "settled",
      closed: status === "closed" || status === "expired",
      rawStatus: data.status,
    };
  },
};

/**
 * Without an API key outside production, payments go through a local fake checkout page
 * (see mayar-mock.ts) so the app can be demoed end to end.
 */
export const usingMockMayar = !env.MAYAR_API_KEY && env.NODE_ENV !== "production";
export const mayar = usingMockMayar ? mockMayar : mayarApi;
