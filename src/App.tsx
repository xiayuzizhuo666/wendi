import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import type { AppSettings, ReadingConfig, ReportDoc, ResearchRun, Scene, StageId } from "@/types";
import { SAMPLES, getSample } from "@/data/samples";
import { sceneFromQuery } from "@/data/scenes";
import { resolveReading } from "@/data/reading";
import { getProviderPreset } from "@/data/providers";
import { effectiveApiKey, loadSettings, saveSettings } from "@/lib/settings";
import { deleteReport, getReport, getRun, listReports, listRuns, saveReport, saveRun } from "@/lib/storage";
import { runResearch } from "@/lib/agent/run";
import { Masthead, SiteFooter } from "@/components/Shell";
import { Home } from "@/components/Home";
import { ReportReader } from "@/components/ReportReader";
import { SettingsSheet } from "@/components/SettingsSheet";
import { MethodSheet } from "@/components/MethodSheet";
import { LibrarySheet } from "@/components/LibrarySheet";
import { ResearchDesk } from "@/components/ResearchDesk";
import { DemoSheet } from "@/components/DemoSheet";
import { clearDemoSession, loadDemoSession, saveDemoSession, type DemoSession } from "@/lib/demo";

type View = { kind: "home" } | { kind: "sample"; slug: string } | { kind: "report"; id: string } | { kind: "research" };

const STAGE_IDS: StageId[] = ["intake", "bare", "search", "evidence", "verify", "frameworks", "debate", "outline", "write", "qa", "typeset"];

function parseHash(): View {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("/sample/")) return { kind: "sample", slug: hash.slice("/sample/".length) };
  if (hash.startsWith("/report/")) return { kind: "report", id: hash.slice("/report/".length) };
  if (hash === "/research") return { kind: "research" };
  return { kind: "home" };
}

function createRun(topic: string, scene: Scene, reading: ReadingConfig, settings: AppSettings): ResearchRun {
  const preset = getProviderPreset(settings.provider.providerId);
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    topic,
    scene,
    depth: reading.depth,
    reading,
    status: "running",
    createdAt: now,
    updatedAt: now,
    stages: STAGE_IDS.map((id) => ({ id, status: "pending", detail: "" })),
    events: [],
    sources: [],
    claims: [],
    conflicts: [],
    debates: [],
    frameworks: [],
    sections: [],
    stats: {
      inputTokens: 0,
      outputTokens: 0,
      calls: 0,
      estimatedCost: 0,
      startedAt: now,
    },
    providerLabel: preset.label,
    model: settings.provider.model,
  };
}

export default function App() {
  const [view, setView] = useState<View>(() => parseHash());
  const [scene, setScene] = useState<Scene>(() => sceneFromQuery(new URLSearchParams(window.location.search).get("scene")));
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    const mock = import.meta.env.DEV && new URLSearchParams(window.location.search).get("mock") === "1";
    if (mock) {
      return {
        rememberKey: false,
        provider: { ...loaded.provider, providerId: "mock", model: "mock-1", apiKey: "mock" },
      };
    }
    return loaded;
  });
  const [demoSession, setDemoSession] = useState<DemoSession | null>(() => loadDemoSession());
  const [demoOpen, setDemoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [activeRun, setActiveRun] = useState<ResearchRun | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeRunRef = useRef<ResearchRun | null>(null);

  useEffect(() => {
    activeRunRef.current = activeRun;
  }, [activeRun]);

  const demoMode = Boolean(demoSession && demoSession.expiresAt > Date.now());
  const runtimeSettings: AppSettings =
    demoMode && demoSession
      ? {
          ...settings,
          provider: {
            ...settings.provider,
            providerId: "deepseek",
            model: demoSession.model,
            baseUrl: "",
            search: { provider: "none", apiKey: "" },
          },
        }
      : settings;

  useEffect(() => {
    if (!demoSession) return;
    const delay = Math.max(0, demoSession.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      clearDemoSession();
      setDemoSession(null);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [demoSession]);

  const sample = view.kind === "sample" ? getSample(view.slug) : undefined;
  const report = view.kind === "report" ? reports.find((item) => item.id === view.id) : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedReports, loadedRuns] = await Promise.all([listReports(), listRuns()]);
      if (cancelled) return;
      setReports(loadedReports.map((report) => ({ ...report, reading: report.reading ?? resolveReading(undefined, report.meta.depth) })));
      const normalizedRuns = loadedRuns.map((run) => {
        const base = { ...run, reading: run.reading ?? resolveReading(undefined, run.depth) };
        if (run.status !== "running") return base;
        return {
          ...base,
          status: "paused" as const,
          events: [
            ...run.events,
            {
              id: crypto.randomUUID(),
              at: Date.now(),
              kind: "system" as const,
              title: "页面刷新，问底已暂停",
              detail: "进度已保留，可以从断点继续。",
              tone: "warn" as const,
            },
          ],
          updatedAt: Date.now(),
        };
      });
      setRuns(normalizedRuns);
      await Promise.all(normalizedRuns.filter((run) => run.status === "paused").map((run) => saveRun(run)));
      if (parseHash().kind === "research") {
        const first = normalizedRuns.find((run) => run.status === "paused" || run.status === "error" || run.status === "running");
        if (first) setActiveRun(first);
        else window.location.hash = "#/";
      }
      setDataLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHash = () => {
      setView(parseHash());
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (view.kind === "sample" && sample) {
      document.title = `${sample.report.title} · 问底`;
    } else if (view.kind === "report" && report) {
      document.title = `${report.title} · 问底`;
    } else if (view.kind === "research") {
      document.title = activeRun ? `${activeRun.topic} · 问底` : "问底";
    } else {
      document.title = "问底 · 把一件好奇的事问到底";
    }
  }, [view, sample, report, activeRun]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const navigate = (next: View) => {
    const hash = next.kind === "sample" ? `#/sample/${next.slug}` : next.kind === "report" ? `#/report/${next.id}` : next.kind === "research" ? "#/research" : "#/";
    if (window.location.hash === hash) setView(next);
    else window.location.hash = hash;
  };

  const changeScene = (nextScene: Scene) => {
    setScene(nextScene);
    const url = new URL(window.location.href);
    if (nextScene === "life") url.searchParams.set("scene", "life");
    else url.searchParams.delete("scene");
    window.history.replaceState({}, "", url);
  };

  const focusComposer = () => {
    navigate({ kind: "home" });
    window.setTimeout(() => {
      document.getElementById("composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => document.getElementById("topic")?.focus(), 350);
    }, 80);
  };

  const persistRun = (next: ResearchRun) => {
    setActiveRun(next);
    setRuns((items) => {
      const index = items.findIndex((item) => item.id === next.id);
      if (index === -1) return [next, ...items];
      const copy = [...items];
      copy[index] = next;
      return copy;
    });
    void saveRun(next);
  };

  const startPipeline = (run: ResearchRun) => {
    const demoToken = demoMode && demoSession ? demoSession.token : "";
    const apiKey = demoToken ? "" : effectiveApiKey(settings);
    if (!demoToken && !apiKey.trim()) {
      toast.error("还没有配置模型 API key");
      setSettingsOpen(true);
      persistRun({ ...run, status: "paused", updatedAt: Date.now() });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setActiveRun({ ...run, status: "running" });
    void runResearch({
      run: { ...run, status: "running" },
      settings: runtimeSettings,
      apiKey,
      demoToken: demoToken || undefined,
      signal: controller.signal,
      onUpdate: (next) => {
        if (controller.signal.aborted && next.status === "running") return;
        persistRun(next);
      },
      onReport: async (nextReport) => {
        await saveReport(nextReport);
        setReports((items) => [nextReport, ...items.filter((item) => item.id !== nextReport.id)]);
        setActiveRun((current) => (current ? { ...current, reportId: nextReport.id, status: "complete", updatedAt: Date.now() } : current));
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("问底 · 报告已完成", { body: nextReport.title, tag: nextReport.id });
          } catch {
            // Notification can fail on some platforms; the in-app toast remains.
          }
        }
        if (window.location.hash.startsWith("#/research")) {
          navigate({ kind: "report", id: nextReport.id });
        } else {
          toast.success("报告已完成", {
            description: nextReport.title,
            action: { label: "打开报告", onClick: () => navigate({ kind: "report", id: nextReport.id }) },
            duration: 12_000,
          });
        }
      },
    }).finally(() => {
      if (abortRef.current === controller) abortRef.current = null;
    });
  };

  const startResearch = (topic: string, nextScene: Scene, reading: ReadingConfig) => {
    const demoToken = demoMode && demoSession ? demoSession.token : "";
    const apiKey = demoToken ? "" : effectiveApiKey(settings);
    if ((!demoToken && !apiKey.trim()) || !runtimeSettings.provider.model.trim()) {
      toast.error("先配置一个模型 key，或先读一份样例。");
      setSettingsOpen(true);
      return;
    }
    if (activeRunRef.current?.status === "running") {
      toast.info("上一个问底还在进行", { description: "先回到问底查看进度，或等它完成后再开始新的问底。" });
      navigate({ kind: "research" });
      return;
    }
    const run = createRun(topic, nextScene, reading, runtimeSettings);
    navigate({ kind: "research" });
    persistRun(run);
    startPipeline(run);
  };

  const pauseResearch = () => {
    const current = activeRunRef.current;
    abortRef.current?.abort();
    if (!abortRef.current && current) {
      const paused: ResearchRun = {
        ...current,
        status: "paused",
        updatedAt: Date.now(),
        events: [
          ...current.events,
          {
            id: crypto.randomUUID(),
            at: Date.now(),
            kind: "system",
            title: "研究已暂停",
            detail: "进度已保留，可以从断点继续。",
            tone: "warn",
          },
        ],
      };
      persistRun(paused);
    }
  };

  const resumeResearch = () => {
    const current = activeRunRef.current;
    if (!current) return;
    if (current.status === "complete" && current.reportId) {
      navigate({ kind: "report", id: current.reportId });
      return;
    }
    const resumed: ResearchRun = { ...current, status: "running", error: undefined, updatedAt: Date.now() };
    persistRun(resumed);
    startPipeline(resumed);
  };

  const openRun = async (id: string) => {
    const run = runs.find((item) => item.id === id) ?? (await getRun(id));
    if (!run) {
      toast.error("这份研究记录不在这台设备上。");
      return;
    }
    setLibraryOpen(false);
    setActiveRun(run);
    navigate({ kind: "research" });
  };

  const openReportById = async (id: string) => {
    let next = reports.find((item) => item.id === id);
    if (!next) next = await getReport(id);
    if (!next) {
      toast.error("找不到这份报告，可能已被清除。");
      return;
    }
    const resolved = next;
    setReports((items) => (items.some((item) => item.id === id) ? items : [resolved, ...items]));
    setLibraryOpen(false);
    navigate({ kind: "report", id });
  };

  const removeReport = async (id: string) => {
    await deleteReport(id);
    setReports((items) => items.filter((item) => item.id !== id));
    if (view.kind === "report" && view.id === id) navigate({ kind: "home" });
    toast.success("报告已删除");
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const handleDemoSuccess = (session: DemoSession) => {
    saveDemoSession(session);
    setDemoSession(session);
    setDemoOpen(false);
    toast.success("评委演示已开启", { description: "20 分钟内可用 deepseek-flash 完成一次真实生成。" });
  };

  const exitDemo = () => {
    clearDemoSession();
    setDemoSession(null);
    toast.info("已退出演示模式");
  };

  const activeReport = view.kind === "report" ? report : undefined;
  const activeSample = view.kind === "sample" ? sample : undefined;

  return (
    <div className="min-h-dvh bg-paper">
      {view.kind === "home" ? (
        <Masthead
          onHome={() => navigate({ kind: "home" })}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
          onOpenMethod={() => setMethodOpen(true)}
          onFocusComposer={focusComposer}
        />
      ) : null}

      {view.kind === "home" ? (
        <Home
          scene={scene}
          settings={settings}
          demoActive={demoMode}
          onSceneChange={changeScene}
          onStart={startResearch}
          onOpenSample={(slug) => navigate({ kind: "sample", slug })}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenDemo={() => setDemoOpen(true)}
          onExitDemo={exitDemo}
          onOpenMethod={() => setMethodOpen(true)}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
      ) : null}

      {view.kind === "research" ? (
        activeRun ? (
          <ResearchDesk
            run={activeRun}
            onBack={() => navigate({ kind: "home" })}
            onPause={pauseResearch}
            onResume={resumeResearch}
            onOpenReport={(id) => void openReportById(id)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          <EmptyResearch onHome={() => navigate({ kind: "home" })} onStart={focusComposer} loading={!dataLoaded} />
        )
      ) : null}

      {view.kind === "sample" && activeSample ? (
        <ReportReader report={activeSample.report} onBack={() => navigate({ kind: "home" })} />
      ) : null}

      {view.kind === "report" && activeReport ? (
        <ReportReader report={activeReport} onBack={() => navigate({ kind: "home" })} />
      ) : null}

      {view.kind === "sample" && !activeSample ? <NotFound onHome={() => navigate({ kind: "home" })} /> : null}
      {view.kind === "report" && !activeReport && dataLoaded ? <NotFound onHome={() => navigate({ kind: "home" })} /> : null}
      {view.kind === "report" && !activeReport && !dataLoaded ? <LoadingPage /> : null}

      {view.kind === "home" ? <SiteFooter /> : null}

      <SettingsSheet open={settingsOpen} settings={settings} onClose={() => setSettingsOpen(false)} onSave={handleSaveSettings} />
      <DemoSheet open={demoOpen} onClose={() => setDemoOpen(false)} onSuccess={handleDemoSuccess} />
      <MethodSheet open={methodOpen} onClose={() => setMethodOpen(false)} />
      <LibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        reports={reports}
        runs={runs}
        onOpenSample={(slug) => {
          setLibraryOpen(false);
          navigate({ kind: "sample", slug });
        }}
        onOpenReport={(id) => void openReportById(id)}
        onOpenRun={(id) => void openRun(id)}
        onDeleteReport={(id) => void removeReport(id)}
        onStartNew={focusComposer}
      />
      {settings.provider.providerId === "mock" ? (
        <div className="fixed bottom-3 left-3 z-[70] border border-gold/50 bg-gold-wash px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-gold">
          开发模拟模式 · 不调用真实模型
        </div>
      ) : null}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#FBF8F1",
            border: "1px solid #D9D0BE",
            color: "#1E1B16",
            borderRadius: "2px",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}

function EmptyResearch({ onHome, onStart, loading }: { onHome: () => void; onStart: () => void; loading: boolean }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center px-5 text-center">
      <h1 className="font-serif-cn text-[32px] tracking-[-0.04em]">{loading ? "正在读取上次的进度…" : "没有进行中的问底"}</h1>
      <p className="mt-3 max-w-[360px] text-[12px] leading-relaxed text-ink-muted">
        {loading ? "从本机浏览器读取上次的进度。" : "写下一件你好奇的事，问底会从拆题、找资料、对证据一直做到成稿。"}
      </p>
      {!loading ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onStart} className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[12px] text-paper-raised hover:bg-vermilion-deep">
            开始问底
          </button>
          <button type="button" onClick={onHome} className="inline-flex h-10 items-center rounded-full border border-rule px-5 text-[12px] text-ink hover:border-ink">
            回到首页
          </button>
        </div>
      ) : (
        <span className="mt-6 size-5 animate-spin rounded-full border-2 border-rule border-t-vermilion" />
      )}
    </div>
  );
}

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-rule border-t-vermilion" />
        <p className="mt-3 text-[11px] text-ink-muted">正在打开报告</p>
      </div>
    </div>
  );
}

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center px-5 text-center">
      <p className="kicker">404 / Not found</p>
      <h1 className="mt-3 font-serif-cn text-[36px] tracking-[-0.04em]">这份报告不在桌上</h1>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-muted">
        可能是链接写错了，也可能是本机浏览器里的报告已被清除。样例报告仍然可以阅读。
      </p>
      <button type="button" onClick={onHome} className="mt-6 inline-flex h-10 items-center bg-ink px-5 text-[11.5px] text-paper-raised hover:bg-vermilion-deep">
        回到首页
      </button>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {SAMPLES.map((item) => (
          <span key={item.slug} className="text-[10px] text-ink-muted">
            {item.report.title}
          </span>
        ))}
      </div>
    </div>
  );
}
