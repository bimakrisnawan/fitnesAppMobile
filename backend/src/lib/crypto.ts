import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM for personal data at rest. Format: "v1:" + base64url(iv | authTag | ciphertext).
// The version prefix lets us rotate keys later without guessing which key a value used.
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PREFIX = "v1:";
const key = Buffer.from(env.DATA_ENCRYPTION_KEY, "base64");

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

/** Throws if the value was tampered with or encrypted under a different key. */
export function decrypt(payload: string): string {
  if (!payload.startsWith(PREFIX)) throw new Error("Unknown ciphertext version");
  const raw = Buffer.from(payload.slice(PREFIX.length), "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}
