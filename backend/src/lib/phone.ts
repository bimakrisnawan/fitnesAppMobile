import { z } from "zod";

/**
 * Indonesian mobile number, accepted as 08…, 628… or +628…, normalised to the local 08… form
 * that Mayar's examples use.
 */
export const indonesianMobile = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(?:\+?62|0)8\d{7,11}$/, "Enter an Indonesian mobile number, e.g. 0812…"))
  .transform((v) => v.replace(/^(?:\+?62)/, "0"));
