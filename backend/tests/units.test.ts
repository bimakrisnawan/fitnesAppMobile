import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../src/lib/crypto.js";
import { startOfLocalWeek, streakDays } from "../src/lib/dates.js";
import { extractYoutubeId } from "../src/lib/youtube.js";
import { indonesianMobile } from "../src/lib/phone.js";
import { addBillingPeriod } from "../src/modules/subscriptions/pricing.js";
import { periodEndAfterResume } from "../src/modules/subscriptions/subscriptions.service.js";

describe("addBillingPeriod", () => {
  it.each([
    ["2026-10-05T10:00:00Z", "2026-11-05T10:00:00Z"],
    ["2027-01-31T00:00:00Z", "2027-02-28T00:00:00Z"],
    ["2028-01-31T00:00:00Z", "2028-02-29T00:00:00Z"], // leap year
    ["2026-12-15T00:00:00Z", "2027-01-15T00:00:00Z"],
  ])("%s → %s", (from, to) => {
    expect(addBillingPeriod(new Date(from)).toISOString()).toBe(new Date(to).toISOString());
  });
});

describe("periodEndAfterResume", () => {
  it("pushes the end date out by the time spent paused", () => {
    const end = periodEndAfterResume(
      { currentPeriodEnd: new Date("2026-11-01T00:00:00Z"), pausedAt: new Date("2026-10-01T00:00:00Z") },
      new Date("2026-10-11T00:00:00Z"),
    );
    expect(end?.toISOString()).toBe("2026-11-11T00:00:00.000Z");
  });
});

describe("crypto", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("081234567890");
    expect(a).not.toBe(encrypt("081234567890"));
    expect(decrypt(a)).toBe("081234567890");
  });

  it("detects tampering", () => {
    const raw = Buffer.from(encrypt("081234567890").slice("v1:".length), "base64url");
    raw[raw.length - 1]! ^= 0x01; // flip one ciphertext bit
    expect(() => decrypt("v1:" + raw.toString("base64url"))).toThrow();
  });
});

describe("extractYoutubeId", () => {
  it.each([
    "dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/embed/dQw4w9WgXcQ",
  ])("reads %s", (v) => {
    expect(extractYoutubeId(v)).toBe("dQw4w9WgXcQ");
  });
  it.each(["", "https://vimeo.com/123", "not a link", "https://youtube.com/watch?v=short"])("rejects %s", (v) => {
    expect(extractYoutubeId(v)).toBeNull();
  });
});

describe("Jakarta dates", () => {
  it("starts the week on Monday in Jakarta time", () => {
    // Sunday 2026-10-11 20:00 UTC is already Monday 03:00 in Jakarta.
    expect(startOfLocalWeek(new Date("2026-10-11T20:00:00Z")).toISOString()).toBe("2026-10-11T17:00:00.000Z");
  });
  it("counts a streak ending today or yesterday", () => {
    const now = new Date("2026-10-06T05:00:00Z"); // Tue 12:00 Jakarta
    expect(streakDays(["2026-10-06", "2026-10-05", "2026-10-04"], now)).toBe(3);
    expect(streakDays(["2026-10-05", "2026-10-04"], now)).toBe(2);
    expect(streakDays(["2026-10-03"], now)).toBe(0);
  });
});

describe("indonesianMobile", () => {
  it.each(["081234567890", "+6281234567890", "6281234567890", "0812-3456-7890"])("accepts %s", (v) => {
    expect(indonesianMobile.parse(v)).toBe("081234567890");
  });
  it.each(["021555123", "+15550100", "08123"])("rejects %s", (v) => {
    expect(indonesianMobile.safeParse(v).success).toBe(false);
  });
});
