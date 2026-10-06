// Development-only stand-in for Mayar: invoices live in memory and are paid by clicking a button
// on a local checkout page. Never used in production (see `usingMockMayar` in mayar.ts).
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import type { CreatedInvoice, CreateInvoiceInput, InvoiceStatus } from "./mayar.js";

interface MockInvoice {
  id: string;
  amount: number;
  description: string;
  customerName: string;
  status: "unpaid" | "paid";
}

const invoices = new Map<string, MockInvoice>();

export const mockMayar = {
  async createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
    const id = randomUUID();
    invoices.set(id, {
      id,
      amount: input.amount,
      description: input.description,
      customerName: input.customerName,
      status: "unpaid",
    });
    return {
      invoiceId: id,
      transactionId: null,
      paymentUrl: `${env.PUBLIC_API_URL}/dev/mock-checkout/${id}`,
      expiresAt: input.expiresAt,
    };
  },

  async getInvoice(invoiceId: string): Promise<InvoiceStatus> {
    const invoice = invoices.get(invoiceId);
    // Unknown after a server restart: report closed so the payment expires instead of hanging.
    if (!invoice) return { invoiceId, amount: 0, paid: false, closed: true, rawStatus: "closed" };
    return {
      invoiceId,
      amount: invoice.amount,
      paid: invoice.status === "paid",
      closed: false,
      rawStatus: invoice.status,
    };
  },
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock QRIS checkout</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f4f4f5;margin:0;padding:24px 16px;color:#18181b}
  .card{max-width:380px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 3px #0002;text-align:center}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600}
  .qr{width:200px;height:200px;margin:20px auto;background:
    repeating-conic-gradient(#18181b 0 25%,#fff 0 50%) 0 0/20px 20px;border:8px solid #fff;outline:1px solid #e4e4e7}
  .amount{font-size:28px;font-weight:700;margin:8px 0}
  button{width:100%;padding:14px;border:0;border-radius:10px;background:#E4572E;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
  .muted{color:#71717a;font-size:14px}
</style></head><body><div class="card">${body}</div></body></html>`;
}

export const mockCheckoutRouter = Router();

mockCheckoutRouter.get("/mock-checkout/:id", (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) {
    res.status(404).send(page(`<h2>Checkout not found</h2><p class="muted">The dev server restarted. Start a new checkout in the app.</p>`));
    return;
  }
  if (invoice.status === "paid") {
    res.send(page(`<h2>Payment received ✓</h2><p class="muted">You can close this window and go back to the app.</p><script>setTimeout(()=>window.close(),1500)</script>`));
    return;
  }
  res.send(
    page(`<span class="badge">DEV · simulated payment</span>
<p class="muted" style="margin-top:16px">${escapeHtml(invoice.description)}</p>
<div class="amount">Rp ${invoice.amount.toLocaleString("id-ID")}</div>
<div class="qr" aria-label="Fake QR code"></div>
<p class="muted">In production this is Mayar's page with a real QRIS code.</p>
<form method="post" action="/dev/mock-checkout/${invoice.id}/pay"><button type="submit">Simulate successful payment</button></form>`),
  );
});

mockCheckoutRouter.post("/mock-checkout/:id/pay", (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (invoice) invoice.status = "paid";
  res.redirect(303, `/dev/mock-checkout/${req.params.id}`);
});
