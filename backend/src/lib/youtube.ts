import { z } from "zod";

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Accepts a bare video id or any common YouTube URL (watch, youtu.be, shorts, embed, live)
 * and returns the 11-character id, or null if it isn't one.
 */
export function extractYoutubeId(input: string | null | undefined): string | null {
  const value = input?.trim();
  if (!value) return null;
  if (ID.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    let candidate: string | null | undefined = null;
    if (host === "youtu.be") candidate = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      candidate = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/)?.[1];
    }
    return candidate && ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/** Accepts a YouTube URL or id; empty string clears it. */
export const youtubeInput = z
  .string()
  .trim()
  .max(300)
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const id = extractYoutubeId(v);
    if (!id) {
      ctx.addIssue({ code: "custom", message: "Not a YouTube link" });
      return z.NEVER;
    }
    return id;
  });

