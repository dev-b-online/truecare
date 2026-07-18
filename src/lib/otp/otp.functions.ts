// OTP flow using sha256 hashes and in-memory challenge store.
// Raw phone numbers and codes never persist. Prod backend replaces the Map with MySQL.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendSms } from "../sms/sms4free.functions";

interface Challenge {
  id: string;
  phoneHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: number;
  consumedAt?: number;
  createdAt: number;
}

// Module-scoped in-memory store. Fine for prototype/demo.
const g = globalThis as unknown as { __trucare_otp?: Map<string, Challenge> };
const store: Map<string, Challenge> = g.__trucare_otp ?? (g.__trucare_otp = new Map());

const rateBucket: Map<string, number[]> = ((
  globalThis as unknown as { __trucare_rate?: Map<string, number[]> }
).__trucare_rate ??= new Map());

function hitLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const arr = (rateBucket.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  rateBucket.set(key, arr);
  return arr.length > max;
}

async function sha256(input: string) {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomId() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, "0");
}

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ phone: z.string().regex(/^05\d{8}$/) }).parse(data))
  .handler(async ({ data }) => {
    const phoneHash = await sha256(data.phone);
    if (hitLimit(`otp:${phoneHash}`, 60 * 60 * 1000, 3)) {
      throw new Error("חרגת ממכסת בקשות אימות לשעה");
    }
    const code = randomCode();
    const codeHash = await sha256(code);
    const id = randomId();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    store.set(id, {
      id,
      phoneHash,
      codeHash,
      attempts: 0,
      expiresAt,
      createdAt: Date.now(),
    });
    const result = await sendSms({
      data: {
        recipient: data.phone,
        message: `קוד האימות שלך ל-TruCare: ${code} (בתוקף ל-5 דקות)`,
      },
    });
    return {
      challengeId: id,
      expiresAt: new Date(expiresAt).toISOString(),
      resendAvailableIn: 60,
      smsOk: result.ok,
    };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        challengeId: z.string().min(8),
        code: z.string().regex(/^\d{6}$/),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const ch = store.get(data.challengeId);
    if (!ch) throw new Error("קוד לא תקין או פג תוקף");
    if (ch.consumedAt) throw new Error("קוד כבר נוצל");
    if (Date.now() > ch.expiresAt) {
      store.delete(data.challengeId);
      throw new Error("הקוד פג תוקף, בקש קוד חדש");
    }
    ch.attempts += 1;
    if (ch.attempts > 5) {
      store.delete(data.challengeId);
      throw new Error("יותר מדי נסיונות שגויים, בקש קוד חדש");
    }
    const codeHash = await sha256(data.code);
    if (codeHash !== ch.codeHash) {
      throw new Error("קוד שגוי");
    }
    ch.consumedAt = Date.now();
    const sessionToken = randomId() + randomId();
    return { sessionToken };
  });

export const resendOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ challengeId: z.string().min(8), phone: z.string().regex(/^05\d{8}$/) }).parse(data),
  )
  .handler(async ({ data }) => {
    if (hitLimit(`resend:${data.challengeId}`, 60 * 1000, 1)) {
      throw new Error("נסה שוב בעוד רגע");
    }
    return await requestOtp({ data: { phone: data.phone } });
  });
