import { env } from "../config/env.js";

/**
 * Images are stored as "/media/<file>" (served from backend/public/media) or as full URLs.
 * Clients always get an absolute URL.
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? `${env.PUBLIC_API_URL}${path}` : path;
}
