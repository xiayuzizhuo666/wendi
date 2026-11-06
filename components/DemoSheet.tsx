import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Loader2, X } from "lucide-react";
import { requestDemoSession, type DemoSession } from "@/lib/demo";

interface DemoSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (session: DemoSession) => void;
}

export function DemoSheet({ open, onClose, onSuccess }: DemoSheetProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCode("");
    setBusy(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const clean = code.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await requestDemoSession(clean);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "邀请码验证失败，请稍后再试。");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="no-print fixed inset-0 z-[95] flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" aria-label="关闭演示入口" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="评委演示" className="relative w-full max-w-[420px] rounded-2xl border border-rule bg-paper-raised p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-serif-cn text-[20px] tracking-[-0.02em] text-ink">评委演示</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
              输入邀请码后，可以用 deepseek-flash 完成一次真实生成。邀请码不会保存，演示会话 20 分钟内有效。
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep hover:text-ink" aria-label="关闭">
            <X size={15} />
          </button>
        </div>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="demo-code" className="text-[12px] text-ink">
            邀请码
          </label>
          <div className="relative mt-2">
            <KeyRound size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              id="demo-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError("");
              }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={80}
              placeholder="输入评委邀请码"
              className="w-full rounded-xl border border-rule bg-paper py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-muted-soft/70 focus:border-ink"
            />
          </div>
          {error ? <p role="alert" className="mt-2 text-[11.5px] text-vermilion-deep">{error}</p> : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[10.5px] leading-relaxed text-ink-muted">演示额度有限，请用于一次完整生成。</p>
            <button
              type="submit"
              disabled={!code.trim() || busy}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[12px] text-paper-raised transition-colors hover:bg-vermilion-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : null}
              {busy ? "验证中" : "进入演示"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
