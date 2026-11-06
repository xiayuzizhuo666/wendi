import { Library, Settings2 } from "lucide-react";
import type { ReactNode } from "react";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M20 4.5v31M4.5 20h31" stroke="currentColor" strokeWidth="0.8" opacity="0.38" />
      <circle cx="20" cy="20" r="3.4" fill="#B23A2E" />
      <path d="M20 7.5v6M20 26.5v6M7.5 20h6M26.5 20h6" stroke="#B23A2E" strokeWidth="1.2" />
    </svg>
  );
}

interface MastheadProps {
  onHome: () => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onOpenMethod: () => void;
  onFocusComposer?: () => void;
}

export function Masthead({ onHome, onOpenSettings, onOpenLibrary, onOpenMethod, onFocusComposer }: MastheadProps) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-rule/80 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-4 px-5 md:h-16 md:px-8">
        <button type="button" onClick={onHome} className="flex min-w-0 items-center gap-2.5 text-left">
          <LogoMark className="size-7 shrink-0 text-ink" />
          <span className="font-serif-cn text-[21px] leading-none tracking-[-0.04em] text-ink">问底</span>
        </button>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex" aria-label="主要导航">
          <button type="button" onClick={onFocusComposer} className="text-[13px] text-ink-soft transition-colors hover:text-ink">
            开始问底
          </button>
          <button type="button" onClick={onOpenLibrary} className="text-[13px] text-ink-soft transition-colors hover:text-ink">
            报告库
          </button>
          <button type="button" onClick={onOpenMethod} className="text-[13px] text-ink-soft transition-colors hover:text-ink">
            方法
          </button>
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenLibrary}
            className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink md:hidden"
            aria-label="打开报告库"
          >
            <Library size={17} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
            aria-label="模型与设置"
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-rule">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-4 px-5 py-8 text-[12px] text-ink-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-5 text-ink" />
          <span className="font-serif-cn text-[15px] text-ink">问底</span>
          <span className="text-ink-muted">把好奇心走到底</span>
        </div>
        <p className="max-w-[520px] leading-relaxed">
          事实、推断与猜测分开标注；找不到证据的地方，明确写「暂缺」。
        </p>
      </div>
    </footer>
  );
}

export function PageFrame({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-paper text-ink">{children}</div>;
}
