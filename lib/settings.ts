import { DEFAULT_PROVIDER_CONFIG, PROVIDER_ORDER, getProviderPreset } from "@/data/providers";
import type { AppSettings, ProviderId } from "@/types";

const SETTINGS_KEY = "wendi:settings:v1";
const SESSION_KEY = "wendi:session-key";

function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && PROVIDER_ORDER.includes(value as ProviderId);
}

export function loadSettings(): AppSettings {
  const fallback: AppSettings = {
    provider: { ...DEFAULT_PROVIDER_CONFIG, search: { ...DEFAULT_PROVIDER_CONFIG.search } },
    rememberKey: true,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const providerId = isProviderId(parsed.provider?.providerId) ? parsed.provider.providerId : "deepseek";
    const preset = getProviderPreset(providerId);
    return {
      rememberKey: parsed.rememberKey !== false,
      provider: {
        providerId,
        model: parsed.provider?.model || preset.defaultModel,
        baseUrl: parsed.provider?.baseUrl || "",
        apiKey: parsed.provider?.apiKey || "",
        search: {
          provider: parsed.provider?.search?.provider ?? "none",
          apiKey: parsed.provider?.search?.apiKey ?? "",
        },
      },
    };
  } catch {
    return fallback;
  }
}

export function saveSettings(settings: AppSettings): void {
  const persisted: AppSettings = {
    rememberKey: settings.rememberKey,
    provider: {
      ...settings.provider,
      apiKey: settings.rememberKey ? settings.provider.apiKey : "",
      search: {
        ...settings.provider.search,
        apiKey: settings.rememberKey ? settings.provider.search.apiKey : "",
      },
    },
  };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
    if (!settings.rememberKey) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ apiKey: settings.provider.apiKey, searchKey: settings.provider.search.apiKey }),
      );
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Local storage can be unavailable in private mode; the app still works for this session.
  }
}

export function effectiveApiKey(settings: AppSettings): string {
  if (settings.provider.apiKey) return settings.provider.apiKey;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return parsed.apiKey ?? "";
  } catch {
    return "";
  }
}

export function effectiveSearchKey(settings: AppSettings): string {
  if (settings.provider.search.apiKey) return settings.provider.search.apiKey;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { searchKey?: string };
    return parsed.searchKey ?? "";
  } catch {
    return "";
  }
}

export function clearStoredKeys(): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppSettings;
      parsed.provider = {
        ...parsed.provider,
        apiKey: "",
        search: { ...parsed.provider.search, apiKey: "" },
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    }
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}

export function hasUsableProvider(settings: AppSettings): boolean {
  return Boolean(effectiveApiKey(settings).trim() && settings.provider.model.trim());
}
