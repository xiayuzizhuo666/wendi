import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, FileText, Layers, Quote, Scale, Search, ShieldCheck, X } from "lucide-react";

const STEPS = [
  { n: "01", title: "拆题", text: "先判断你好奇的是什么、属于哪类问题，再决定用哪几副透镜。不是所有问题都值得上一套重流程。" },
  { n: "02", title: "先看一眼", text: "在戴框架之前，先写下第一眼看到什么、哪些假设需要检验、有什么跨领域类比。它不产生结论，只产生应该追问的方向。" },
  { n: "03", title: "找资料", text: "把问题拆成 6—8 个子问题，分别去百科、论文、官方文档、代码仓库、社区和反方那里找线索。预置免费信息源，也支持你接入自己的搜索 API。" },
  { n: "04", title: "找证据", text: "从每个来源里摘出可核查的主张、原话、出处、类型与证据强度。不能回到原文的说法，不进入证据账本。" },
  { n: "05", title: "反方上桌", text: "把支持与反对的最强论证分别写成钢人版本，再做判断。区分「证据支持」「合理推断」「目前无法判断」。" },
  { n: "06", title: "写成读物", text: "按读者的理解路线重写，不是按搜索结果的顺序拼接。配时间线、概念图、对比矩阵与争议场，然后过可信度检查、排版成 PDF。" },
];

const GATES = [
  ["来源硬度", "来源够不够多、够不够独立；优先一手与多类型来源。"],
  ["反方强度", "有没有认真处理最强反方，而不是稻草人。"],
  ["推断透明度", "事实、解释、预测分开；判断有标注，引用能回到原文。"],
  ["未知与争议", "哪些还没解决、哪些存在分歧；不假装确定。"],
  ["时效与可证伪", "信息截止到什么时候；什么新证据会改变判断。"],
];

interface MethodSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MethodSheet({ open, onClose }: MethodSheetProps) {
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

  if (!open) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-[85] flex justify-end">
      <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="关闭方法说明" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="方法与边界"
        className="relative flex h-full w-full max-w-[680px] flex-col border-l border-rule bg-paper-raised shadow-2xl animate-fade-in"
      >
        <div className="flex items-center justify-between border-b border-rule px-5 py-4 md:px-7">
          <div>
            <h2 className="font-serif-cn text-[24px] tracking-[-0.03em] text-ink">一篇问底是怎么发生的</h2>
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

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7">
          <p className="max-w-[560px] font-serif-cn text-[16px] leading-[1.95] text-ink-soft">
            问底不是「在模型外面套一个输入框」。它把一次问底拆成可检查的阶段：先决定怎么问，再去找证据，再把反方放上桌，最后才写。每一步都会留下痕迹，供你复核。
          </p>

          <div className="mt-8 grid gap-0 border-y border-rule">
            {STEPS.map((step, index) => (
              <div key={step.n} className={`grid grid-cols-[38px_1fr] gap-4 py-4 ${index === STEPS.length - 1 ? "" : "border-b border-rule"}`}>
                <span className="text-[11px] leading-6 text-ink-muted">{step.n}</span>
                <div>
                  <h3 className="font-sans text-[13.5px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-[11.5px] leading-[1.85] text-ink-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="mt-9">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-jade" />
              <h3 className="font-serif-cn text-[24px] tracking-[-0.02em]">五个可信度信号</h3>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
              后台会跑一套检查，但前台只给你五个能判断读物的信号。它们不是分数，而是你在决定要不要相信这篇读物时最该看的五件事。
            </p>
            <div className="mt-4 grid gap-px border border-rule bg-rule sm:grid-cols-2">
              {GATES.map(([title, text]) => (
                <div key={title} className="bg-paper px-4 py-3.5">
                  <p className="text-[11.5px] font-medium text-ink">{title}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-9 grid gap-4 sm:grid-cols-2">
            <div className="border border-rule p-4">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-vermilion" />
                <h3 className="font-sans text-[12.5px] font-semibold">你会拿到什么</h3>
              </div>
              <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-ink-muted">
                <li>— 三句话结论与关键问题</li>
                <li>— 带引用的正文、时间线、概念图、对比矩阵</li>
                <li>— 正反双方的钢人论证与当前判断</li>
                <li>— 来源清单、五个可信度信号与局限</li>
                <li>— 可下载的 PDF 与结构化数据</li>
              </ul>
            </div>
            <div className="border border-rule p-4">
              <div className="flex items-center gap-2">
                <Scale size={14} className="text-jade" />
                <h3 className="font-sans text-[12.5px] font-semibold">我们刻意不做的事</h3>
              </div>
              <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-ink-muted">
                <li>— 不把搜索结果拼成一篇小作文</li>
                <li>— 不为了「看起来完整」而编造细节</li>
                <li>— 不把类比当成因果证据</li>
                <li>— 不在证据不足时强行二选一</li>
                <li>— 不替你做医疗、投资或法律决定</li>
              </ul>
            </div>
          </section>

          <section className="mt-8 border-l-2 border-vermilion bg-vermilion-wash/35 px-5 py-4">
            <div className="flex items-center gap-2">
              <Quote size={14} className="text-vermilion" />
              <p className="text-[11px] text-ink-muted">一句实话</p>
            </div>
            <p className="mt-2 font-serif-cn text-[15px] leading-[1.9] text-ink-soft">
              通过可信度检查不等于答案正确。它只说明：在可用信息范围内，推理自洽、来源可查、反方被认真对待。复杂问题没有预先准备好的标准答案。
            </p>
          </section>

          <section className="mt-8 grid gap-3 border-t border-rule pt-5 sm:grid-cols-3">
            <div>
              <Search size={14} className="text-vermilion" />
              <p className="mt-2 text-[11px] font-medium text-ink">取证优先</p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">先找一手来源，再允许解释。</p>
            </div>
            <div>
              <Layers size={14} className="text-jade" />
              <p className="mt-2 text-[11px] font-medium text-ink">多副透镜</p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">纵轴看历史，横轴看版图，第一性原理看机制。</p>
            </div>
            <div>
              <FileText size={14} className="text-gold" />
              <p className="mt-2 text-[11px] font-medium text-ink">写给读者</p>
              <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">不是展示分析，而是让人读完能判断。</p>
            </div>
          </section>

          <p className="mt-8 text-[11px] text-ink-muted">
            方法：横纵分析法 / 第一性原理 / 钢人论证 / 可信度检查
          </p>
        </div>

        <div className="border-t border-rule bg-paper px-5 py-4 md:px-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-ink-muted">完整读物会保留方法说明与五个可信度信号。</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 border border-ink px-4 text-[11px] text-ink transition-colors hover:bg-ink hover:text-paper-raised"
            >
              回到问底 <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
