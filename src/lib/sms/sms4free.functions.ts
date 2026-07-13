// Server-only SMS sender via sms4free.
// Credentials NEVER cross the browser boundary. This module runs on the server.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SMS4FREE_URL = "https://api.sms4free.co.il/ApiSMS/SendSMS";

const sendSmsInput = z.object({
  recipient: z.string().regex(/^05\d{8}$/, "IL mobile only"),
  message: z.string().min(1).max(480),
});

export type SendSmsInput = z.infer<typeof sendSmsInput>;

export interface SendSmsResult {
  ok: boolean;
  providerCode: number;
  error?: string;
}

function maskRecipient(phone: string) {
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

async function callSms4Free(payload: {
  key: string;
  user: string;
  pass: string;
  sender: string;
  recipient: string;
  msg: string;
}): Promise<SendSmsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(SMS4FREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = (await res.text()).trim();
    const code = Number.parseInt(text, 10);
    if (Number.isNaN(code)) {
      return { ok: false, providerCode: -999, error: `unexpected response: ${text.slice(0, 60)}` };
    }
    if (code > 0) return { ok: true, providerCode: code };
    return { ok: false, providerCode: code, error: `provider error ${code}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network_error";
    return { ok: false, providerCode: -1, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

export const sendSms = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSmsInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.SMS4FREE_KEY ?? "";
    const user = process.env.SMS4FREE_USER ?? "";
    const pass = process.env.SMS4FREE_PASS ?? "";
    const sender = process.env.SMS4FREE_SENDER ?? "TruCare";

    if (!key || !user || !pass) {
      // Log-only: never leak recipient raw.
      console.warn("[sms4free] missing credentials; dropping message", {
        to: maskRecipient(data.recipient),
      });
      return {
        ok: false,
        providerCode: -1000,
        error: "sms provider not configured",
        recipientMasked: maskRecipient(data.recipient),
      };
    }

    const result = await callSms4Free({
      key,
      user,
      pass,
      sender,
      recipient: data.recipient,
      msg: data.message,
    });

    // Structured log (masked). A real backend would insert into notifications_log.
    console.log("[sms4free] send", {
      to: maskRecipient(data.recipient),
      ok: result.ok,
      code: result.providerCode,
    });

    return { ...result, recipientMasked: maskRecipient(data.recipient) };
  });
