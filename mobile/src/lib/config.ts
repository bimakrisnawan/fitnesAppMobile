// On a physical device, "localhost" is the phone itself — use your computer's LAN IP in .env.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
