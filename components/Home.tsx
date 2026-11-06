import { useRef, useState } from "react";
import { ArrowRight, ArrowUp, Settings2 } from "lucide-react";
import type { AppSettings, Depth, NarrativeStyle, ReadingConfig, Scene } from "@/types";
import { SAMPLES, type SampleEntry } from "@/data/samples";
import { SCENES, SCENE_ORDER } from "@/data/scenes";
import { DEPTHS, DEPTH_ORDER, STYLES, STYLE_ORDER } from "@/data/reading";
import { getProviderPreset } from "@/data/providers";
import { effectiveApiKey } from "@/lib/settings";
import { TitleText } from "@/components/report/TitleText";

interface HomeProps {
  scene: Scene;
  settings: AppSettings;
  demoActive: boolean;
  onSceneChange: (scene: Scene) => void;
  onStart: (topic: string, scene: Scene, reading: ReadingConfig) => void;
  onOpenSample: (slug: string) => void;
  onOpenSettings: () => void;
  onOpenDemo: () => void;
  onExitDemo: () => void;
  onOpenMethod: () => void;
  onOpenLibrary: () => void;
}

export function Home({
  scene,
  settings,
  demoActive,
  onSceneChange,
  onStart,
  onOpenSample,
  onOpenSettings,
  onOpenDemo,
  onExitDemo,
  onOpenMethod,
  onOpenLibrary,
}: HomeProps) {
  const def = SCENES[scene];
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState<NarrativeStyle>("explain");
  const [depth, setDepth] = useState<Depth>("deep");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasKey = demoActive || Boolean(effectiveApiKey(settings).trim() && settings.provider.model.trim());
  const preset = getProviderPreset(settings.provider.providerId);
  const orderedSamples = [...SAMPLES].sort((a, b) => {
    const aMatch = a.report.meta.scene === scene ? 0 : 1;
    const bMatch = b.report.meta.scene === scene ? 0 : 1;
    return aMatch - bMatch;
  });
  const intro =
    scene === "study"
      ? "从一个问题出发，找一手资料、对立观点与历史脉络，写成一份读得完的读物。"
      : "先弄清它是什么、谁在说、证据够不够，再决定它跟你有什么关系。";

  const submit = () => {
    const clean = topic.trim();
    if (!clean) {
      setError("先写下一件你好奇的事。");
      textareaRef.current?.focus();
      return;
    }
    if (!hasKey) {
      setError("还没有配置模型。可以先读一份样例，或花 30 秒配置自己的模型。");
      onOpenSettings();
      return;
    }
    setError("");
    onStart(clean, scene, { style, depth, focus: focus.trim() || undefined });
  };

  const pickExample = (value: string) => {
    setTopic(value);
    setError("");
    textareaRef.current?.focus();
  };

  return (
    <main>
      <section className="mx-auto max-w-[980px] px-5 pb-10 pt-16 md:px-8 md:pt-24">
        <div className="mx-auto max-w-[720px] text-center">
          <h1 className="font-serif-cn text-[38px] leading-[1.12] tracking-[-0.04em] text-ink sm:text-[48px] md:text-[56px]">
            把一件好奇的事，
            <br />
            问到底
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[14px] leading-7 text-ink-muted">{intro}</p>
        </div>

        <div id="composer" className="mx-auto mt-10 max-w-[760px] scroll-mt-24">
          <div className="rounded-2xl border border-rule bg-paper-raised p-1.5 shadow-[0_2px_14px_rgba(0,0,0,0.04)]">
            <textarea
              id="topic"
              ref={textareaRef}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
              }}
              rows={3}
              maxLength={160}
              placeholder={def.placeholder}
              aria-label="你想搞懂什么"
              className="min-h-[128px] w-full resize-none rounded-xl border-0 bg-transparent px-4 py-4 text-[17px] leading-7 text-ink outline-none placeholder:text-ink-muted-soft/70"
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule px-3 py-2.5">
              <div className="flex items-center gap-1" role="tablist" aria-label="选择场景">
                {SCENE_ORDER.map((id) => {
                  const active = id === scene;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onSceneChange(id)}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${
                        active ? "bg-paper-deep text-ink" : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {SCENES[id].label}
                    </button>
                  );
                })}
              </div>

              <span className="hidden h-4 w-px bg-rule sm:block" />

              <div className="flex items-center gap-2 text-[11.5px]">
                <span className="text-ink-muted">读感</span>
                {STYLE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={style === id}
                    title={STYLES[id].description}
                    onClick={() => setStyle(id)}
                    className={`rounded-full px-2 py-0.5 transition-colors ${style === id ? "bg-paper-deep font-medium text-ink" : "text-ink-muted hover:text-ink"}`}
                  >
                    {STYLES[id].label}
                  </button>
                ))}
              </div>

              <span className="hidden h-4 w-px bg-rule sm:block" />

              <div className="flex items-center gap-2 text-[11.5px]">
                <span className="text-ink-muted">深度</span>
                {DEPTH_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={depth === id}
                    title={DEPTHS[id].description}
                    onClick={() => setDepth(id)}
                    className={`rounded-full px-2 py-0.5 transition-colors ${depth === id ? "bg-paper-deep font-medium text-ink" : "text-ink-muted hover:text-ink"}`}
                  >
                    {DEPTHS[id].label}
                  </button>
                ))}
              </div>

              <span className="ml-auto hidden text-[11px] text-ink-muted lg:block">{DEPTHS[depth].minutes}</span>
            </div>

            <input
              id="focus"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              maxLength={120}
              placeholder="想特别搞懂什么？（可选）"
              aria-label="特别想搞懂什么"
              className="w-full border-t border-rule bg-transparent px-4 py-2.5 text-[12px] text-ink outline-none placeholder:text-ink-muted-soft/70"
            />

            <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted transition-colors hover:text-ink"
                >
                  <span className={`size-1.5 rounded-full ${hasKey ? "bg-jade" : "bg-vermilion"}`} />
                  {demoActive ? "评委演示 · deepseek-flash" : hasKey ? `${preset.label} · ${settings.provider.model}` : "配置模型"}
                  {demoActive ? null : <Settings2 size={12} />}
                </button>
                {demoActive ? (
                  <button type="button" onClick={onExitDemo} className="text-[11px] text-ink-muted underline decoration-rule underline-offset-2 hover:text-ink">
                    退出演示
                  </button>
                ) : (
                  <button type="button" onClick={onOpenDemo} className="text-[11px] text-ink-muted underline decoration-rule underline-offset-2 hover:text-ink">
                    评委演示
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => orderedSamples[0] && onOpenSample(orderedSamples[0].slug)}
                  className="hidden px-2 text-[12px] text-ink-muted transition-colors hover:text-ink sm:block"
                >
                  先读样例
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-medium text-paper-raised transition-colors hover:bg-vermilion-deep"
                >
                  开始问底
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-3 px-1 text-[12px] text-vermilion-deep">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {def.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => pickExample(example)}
                className="rounded-full border border-rule px-3 py-1.5 text-[11.5px] text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-[11.5px] text-ink-muted">报告会标注来源和不确定性，不替你下结论。</p>
        </div>
      </section>

      <section className="mx-auto max-w-[760px] px-5 pb-20 pt-10 md:px-8 md:pt-14">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <h2 className="text-[13px] font-medium text-ink">样例</h2>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onOpenMethod} className="text-[12px] text-ink-muted transition-colors hover:text-ink">
              方法
            </button>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="inline-flex items-center gap-1 text-[12px] text-ink-muted transition-colors hover:text-ink"
            >
              全部报告 <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="divide-y divide-rule">
          {orderedSamples.slice(0, 4).map((sample) => (
            <SampleRow key={sample.slug} sample={sample} onOpen={() => onOpenSample(sample.slug)} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SampleRow({ sample, onOpen }: { sample: SampleEntry; onOpen: () => void }) {
  const { report } = sample;
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-start justify-between gap-6 py-4 text-left">
      <div className="min-w-0">
        <p className="font-serif-cn text-[17px] leading-snug text-ink transition-colors group-hover:text-vermilion">
          <TitleText text={report.title} />
        </p>
        <p className="mt-1 line-clamp-1 text-[12px] text-ink-muted">{sample.blurb}</p>
      </div>
      <span className="mt-1 shrink-0 text-[11px] text-ink-muted">
        {report.meta.readingMinutes} 分钟 · {report.meta.sourceCount} 个来源
      </span>
    </button>
  );
}
