import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, EyeOff, KeyRound, Loader2, Search, Shield, X } from "lucide-react";
import { toast } from "sonner";
import type { AppSettings, ProviderId, SearchProvider } from "@/types";
import { PROVIDER_ORDER, PROVIDER_PRESETS, SEARCH_PROVIDERS, getProviderPreset } from "@/data/providers";
import { clearStoredKeys, effectiveApiKey, effectiveSearchKey } from "@/lib/settings";
import { testConnection } from "@/lib/llm";

interface SettingsSheetProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

export function SettingsSheet({ open, settings, onClose, onSave }: SettingsSheetProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  useEffect(() => {
    if (!open) return;
    setDraft(settings);
    setShowKey(false);
    setTest({ status: "idle" });
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const preset = useMemo(() => getProviderPreset(draft.provider.providerId), [draft.provider.providerId]);
  const currentKey = effectiveApiKey(draft);
  const currentSearchKey = effectiveSearchKey(draft);

  if (!open) return null;

  const selectProvider = (id: ProviderId) => {
    const next = getProviderPreset(id);
    setDraft((value) => ({
      ...value,
      provider: {
        ...value.provider,
        providerId: id,
        model: next.defaultModel || value.provider.model,
        baseUrl: id === "custom" ? value.provider.baseUrl ?? "" : "",
      },
    }));
    setTest({ status: "idle" });
  };

  const runTest = async () => {
    setTest({ status: "testing" });
    try {
      const reply = await testConnection(draft.provider, currentKey);
      setTest({ status: "ok", message: `连接成功：${reply.slice(0, 30)}` });
    } catch (error) {
      setTest({ status: "error", message: error instanceof Error ? error.message : "连接失败" });
    }
  };

  const save = () => {
    if (draft.provider.providerId === "custom" && draft.provider.baseUrl && !/^https:\/\//i.test(draft.provider.baseUrl)) {
      toast.error("自定义端点必须是 HTTPS 地址");
      return;
    }
    onSave({ ...draft, provider: { ...draft.provider, apiKey: currentKey, search: { ...draft.provider.search, apiKey: currentSearchKey } } });
    toast.success("设置已保存到本机");
    onClose();
  };

  const clearKeys = () => {
    clearStoredKeys();
    setDraft((value) => ({
      ...value,
      provider: { ...value.provider, apiKey: "", search: { ...value.provider.search, apiKey: "" } },
    }));
    setTest({ status: "idle" });
    toast.success("本机密钥已清除");
  };

  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]" aria-label="关闭设置" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="模型与设置"
        className="relative flex h-full w-full max-w-[540px] flex-col border-l border-rule bg-paper-raised shadow-2xl animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4 md:px-6">
          <div>
            <h2 className="font-serif-cn text-[22px] tracking-[-0.03em] text-ink">模型与设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="flex gap-3 border border-jade/25 bg-jade-wash/40 px-4 py-3">
            <Shield size={16} className="mt-0.5 shrink-0 text-jade" />
            <p className="text-[11px] leading-relaxed text-ink-soft">
              问底不存储你的 API key。它只保存在本机浏览器，并随每次请求经本站边缘函数转发给模型；服务端不落库、不写日志。公共电脑上建议使用限额 key。
            </p>
          </div>

          <section className="mt-7">
            <p className="text-[12px] text-ink">模型服务</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PROVIDER_ORDER.map((id) => {
                const item = PROVIDER_PRESETS.find((presetItem) => presetItem.id === id)!;
                const active = draft.provider.providerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectProvider(id)}
                    className={`flex items-center gap-2.5 border px-3 py-2.5 text-left transition-colors ${
                      active ? "border-ink bg-ink text-paper-raised" : "border-rule bg-paper text-ink hover:border-rule-strong"
                    }`}
                  >
                    <span className={`flex size-7 shrink-0 items-center justify-center font-mono text-[9px] ${active ? "bg-paper/15 text-paper-raised" : "bg-paper-deep text-ink-muted"}`}>
                      {item.monogram}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] font-medium">{item.label}</span>
                      <span className={`mt-0.5 block truncate text-[10px] ${active ? "text-paper/60" : "text-ink-muted"}`}>
                        {item.defaultModel || "自定义接口"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">{preset.note}</p>
          </section>

          <section className="mt-7 grid gap-4">
            <div>
              <label htmlFor="model-name" className="block text-[12px] text-ink">
                模型名
              </label>
              <input
                id="model-name"
                list="model-suggestions"
                value={draft.provider.model}
                onChange={(event) => setDraft((value) => ({ ...value, provider: { ...value.provider, model: event.target.value } }))}
                placeholder={preset.defaultModel || "填写模型名或推理接入点 ID"}
                className="mt-2 w-full border border-rule bg-paper px-3 py-2.5 font-mono text-[12px] text-ink outline-none transition-colors placeholder:text-ink-muted-soft focus:border-ink"
              />
              <datalist id="model-suggestions">
                {preset.models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <p className="mt-1.5 text-[10px] text-ink-muted">模型名必须以你账号控制台实际可用的为准；豆包请填方舟推理接入点 ID。</p>
            </div>

            {draft.provider.providerId === "custom" ? (
              <div>
                <label htmlFor="base-url" className="block text-[12px] text-ink">
                  接口地址
                </label>
                <input
                  id="base-url"
                  value={draft.provider.baseUrl ?? ""}
                  onChange={(event) => setDraft((value) => ({ ...value, provider: { ...value.provider, baseUrl: event.target.value } }))}
                  placeholder="https://your-endpoint.example.com/v1"
                  className="mt-2 w-full border border-rule bg-paper px-3 py-2.5 font-mono text-[12px] text-ink outline-none transition-colors placeholder:text-ink-muted-soft focus:border-ink"
                />
                <p className="mt-1.5 text-[10px] text-ink-muted">仅支持公网 HTTPS 的 OpenAI 兼容 /chat/completions 端点。</p>
              </div>
            ) : null}

            <div>
              <label htmlFor="api-key" className="block text-[12px] text-ink">
                API Key
              </label>
              <div className="relative mt-2">
                <KeyRound size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={currentKey}
                  onChange={(event) => setDraft((value) => ({ ...value, provider: { ...value.provider, apiKey: event.target.value } }))}
                  placeholder="粘贴你的模型 API key"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full border border-rule bg-paper py-2.5 pl-9 pr-10 font-mono text-[12px] text-ink outline-none transition-colors placeholder:text-ink-muted-soft focus:border-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink"
                  aria-label={showKey ? "隐藏 key" : "显示 key"}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </section>

          <section className="mt-7 border-t border-rule pt-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-ink">联网搜索</p>
              <Search size={13} className="text-ink-muted" />
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-ink-muted">
              默认使用问底预置的免费信息源。配置博查、Tavily、Firecrawl 或 Serper 后，会额外补充网页搜索结果。
            </p>
            <div className="mt-3 grid gap-2">
              <select
                value={draft.provider.search.provider}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    provider: { ...value.provider, search: { ...value.provider.search, provider: event.target.value as SearchProvider } },
                  }))
                }
                className="w-full border border-rule bg-paper px-3 py-2.5 text-[12px] text-ink outline-none focus:border-ink"
              >
                {SEARCH_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
              {draft.provider.search.provider !== "none" ? (
                <input
                  type="password"
                  value={currentSearchKey}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      provider: { ...value.provider, search: { ...value.provider.search, apiKey: event.target.value } },
                    }))
                  }
                  placeholder={SEARCH_PROVIDERS.find((item) => item.id === draft.provider.search.provider)?.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full border border-rule bg-paper px-3 py-2.5 font-mono text-[12px] text-ink outline-none placeholder:text-ink-muted-soft focus:border-ink"
                />
              ) : null}
              <p className="text-[10px] leading-relaxed text-ink-muted">
                {SEARCH_PROVIDERS.find((item) => item.id === draft.provider.search.provider)?.note}
              </p>
            </div>
          </section>

          <section className="mt-7 flex items-start gap-2.5 border-t border-rule pt-5">
            <input
              id="remember-key"
              type="checkbox"
              checked={draft.rememberKey}
              onChange={(event) => setDraft((value) => ({ ...value, rememberKey: event.target.checked }))}
              className="mt-0.5 size-3.5 accent-[#B23A2E]"
            />
            <label htmlFor="remember-key" className="text-[10.5px] leading-relaxed text-ink-muted">
              在这台设备上记住 key。取消勾选后，key 只保留到关闭浏览器标签页为止。
            </label>
          </section>

          {test.status !== "idle" ? (
            <div
              className={`mt-4 flex items-start gap-2 border px-3 py-2.5 text-[11px] leading-relaxed ${
                test.status === "ok"
                  ? "border-jade/30 bg-jade-wash/50 text-jade"
                  : test.status === "error"
                    ? "border-vermilion/30 bg-vermilion-wash/50 text-vermilion-deep"
                    : "border-rule bg-paper text-ink-muted"
              }`}
            >
              {test.status === "testing" ? <Loader2 size={13} className="mt-0.5 animate-spin" /> : test.status === "ok" ? <Check size={13} className="mt-0.5" /> : null}
              <span>{test.status === "testing" ? "正在用最小请求测试连接…" : test.message}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-rule bg-paper px-5 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={clearKeys} className="text-[10.5px] text-ink-muted underline decoration-rule underline-offset-4 hover:text-vermilion">
              清除本机密钥
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runTest}
                disabled={test.status === "testing" || !currentKey.trim() || !draft.provider.model.trim()}
                className="inline-flex h-9 items-center gap-1.5 border border-ink/20 px-3 text-[11px] text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {test.status === "testing" ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                测试连接
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex h-9 items-center gap-1.5 bg-ink px-4 text-[11.5px] font-medium text-paper-raised transition-colors hover:bg-vermilion-deep"
              >
                保存设置
              </button>
            </div>
          </div>
          <p className="mt-2 text-[9.5px] text-ink-muted">样例报告不需要 key；真实研究才会调用模型。</p>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
