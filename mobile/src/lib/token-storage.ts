import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Refresh token lives in the OS keychain/keystore. The access token is short-lived and kept in memory only.
// SecureStore has no web implementation; the web build (used for quick demos) falls back to localStorage.
const REFRESH_TOKEN_KEY = "refreshToken";
const isWeb = Platform.OS === "web";

export const tokenStorage = {
  getRefreshToken: async () => (isWeb ? localStorage.getItem(REFRESH_TOKEN_KEY) : SecureStore.getItemAsync(REFRESH_TOKEN_KEY)),
  setRefreshToken: async (token: string) =>
    isWeb ? localStorage.setItem(REFRESH_TOKEN_KEY, token) : SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: async () => (isWeb ? localStorage.removeItem(REFRESH_TOKEN_KEY) : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)),
};
