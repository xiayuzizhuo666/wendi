import { useEffect, useRef, useState } from "react";
import type { ReportDoc } from "../../types";
import { downloadBlob, downloadText, safeFilename } from "../format";
import { renderTypst } from "./render";

export type PdfState = "idle" | "compiling" | "ready" | "error";

interface PdfSnapshot {
  status: PdfState;
  source: string;
  blob?: Blob;
  url?: string;
  message?: string;
}

const WORKER_ERROR =
  "PDF 排版引擎没有完成这次编译。你仍然可以打印网页版，或下载 .typ 源文件在本机用 Typst 编译。";
const LOAD_ERROR =
  "PDF 排版引擎加载失败。你仍然可以打印网页版，或下载 .typ 源文件在本机用 Typst 编译。";

export function useTypstPdf(report: ReportDoc) {
  const [snapshot, setSnapshot] = useState<PdfSnapshot>({ status: "idle", source: "" });
  const [nonce, setNonce] = useState(0);
  const urlRef = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let source = "";
    try {
      source = renderTypst(report);
    } catch (error) {
      setSnapshot({
        status: "error",
        source: "",
        message: error instanceof Error ? error.message : "报告结构无法排版",
      });
      return;
    }

    setSnapshot({ status: "compiling", source });
    let worker: Worker | null = null;
    let timer: number | null = null;

    const cleanupWorker = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      worker?.terminate();
      worker = null;
      workerRef.current = null;
    };

    const finishReady = (blob: Blob) => {
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setSnapshot({ status: "ready", source, blob, url });
      cleanupWorker();
    };

    const fail = (message: string) => {
      if (cancelled) return;
      setSnapshot({ status: "error", source, message });
      cleanupWorker();
    };

    const startWorker = () => {
      if (cancelled) return;
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      const id = crypto.randomUUID();
      timer = window.setTimeout(() => {
        worker?.postMessage({ id, source });
      }, 650);

      worker.onmessage = (event: MessageEvent<{ id: string; ok: boolean; pdf?: Uint8Array }>) => {
        if (cancelled || event.data.id !== id) return;
        if (event.data.ok && event.data.pdf) {
          const blob = new Blob([new Uint8Array(event.data.pdf).buffer as ArrayBuffer], { type: "application/pdf" });
          finishReady(blob);
        } else {
          fail(WORKER_ERROR);
        }
      };
      worker.onerror = () => fail(LOAD_ERROR);
    };

    if (report.sample) {
      const slug = report.id.replace(/^sample-/, "");
      fetch(`/samples/${slug}.pdf`)
        .then((response) => {
          if (!response.ok) throw new Error("sample_pdf_missing");
          return response.blob();
        })
        .then((blob) => finishReady(blob))
        .catch(() => {
          if (!cancelled) startWorker();
        });
    } else {
      startWorker();
    }

    return () => {
      cancelled = true;
      cleanupWorker();
    };
  }, [report, nonce]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  const downloadPdf = () => {
    if (snapshot.blob) {
      downloadBlob(snapshot.blob, `${safeFilename(report.title)}.pdf`);
      return true;
    }
    return false;
  };

  const downloadTyp = () => {
    if (snapshot.source) downloadText(snapshot.source, `${safeFilename(report.title)}.typ`, "text/plain;charset=utf-8");
  };

  return {
    ...snapshot,
    downloadPdf,
    downloadTyp,
    retry: () => setNonce((value) => value + 1),
  };
}
