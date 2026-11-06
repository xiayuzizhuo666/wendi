export interface DemoSession {
  token: string;
  expiresAt: number;
  model: string;
  maxCalls: number;
}

const DEMO_SESSION_KEY = "wendi:demo-session";

export function loadDemoSession(): DemoSession | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      return null;
    }
    return {
      token: parsed.token,
      expiresAt: parsed.expiresAt,
      model: parsed.model || "deepseek-flash",
      maxCalls: parsed.maxCalls || 36,
    };
  } catch {
    return null;
  }
}

export function saveDemoSession(session: DemoSession): void {
  try {
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  } catch {
    // The demo still works in memory for this page.
  }
}

export function clearDemoSession(): void {
  try {
    sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

export async function requestDemoSession(code: string): Promise<DemoSession> {
  const response = await fetch("/functions/v1/app/demo/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<DemoSession> & { ok?: boolean; message?: string; error?: string })
    | null;
  if (!response.ok || !payload?.ok || !payload.token || !payload.expiresAt) {
    throw new Error(payload?.message || "邀请码验证失败，请稍后再试。");
  }
  return {
    token: payload.token,
    expiresAt: payload.expiresAt,
    model: payload.model || "deepseek-flash",
    maxCalls: payload.maxCalls || 36,
  };
}
