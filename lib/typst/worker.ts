import { createTypstCompiler, loadFonts } from "@myriaddreamin/typst.ts";

type TypstCompiler = ReturnType<typeof createTypstCompiler>;

const scope = self as unknown as {
  location: { origin: string };
  onmessage: ((event: MessageEvent<{ id: string; source: string }>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

let compilerPromise: Promise<TypstCompiler> | null = null;

async function loadCompilerWasm(): Promise<ArrayBuffer> {
  const urls = [
    "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm",
    "https://unpkg.com/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm",
    "https://fastly.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm",
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.arrayBuffer();
    } catch {
      // Try the next CDN.
    }
  }
  throw new Error("typst_wasm_fetch_failed");
}

async function getCompiler(): Promise<TypstCompiler> {
  if (!compilerPromise) {
    const compiler = createTypstCompiler();
    await compiler.init({
      getModule: () => loadCompilerWasm(),
      beforeBuild: [
        loadFonts([
          new URL("/fonts/WendiSerif-Regular.ttf", scope.location.origin).toString(),
          new URL("/fonts/WendiSans-SemiBold.ttf", scope.location.origin).toString(),
        ]),
      ],
    });
    compilerPromise = Promise.resolve(compiler);
  }
  return compilerPromise;
}

scope.onmessage = async (event) => {
  const { id, source } = event.data;
  try {
    const compiler = await getCompiler();
    compiler.addSource("/main.typ", source);
    const result = await compiler.compile({
      mainFilePath: "/main.typ",
      format: 1,
      diagnostics: "full",
    });
    if (!result.result) {
      const detail = result.diagnostics ? JSON.stringify(result.diagnostics).slice(0, 800) : "没有返回 PDF 数据";
      throw new Error(detail);
    }
    const bytes = result.result;
    scope.postMessage({ id, ok: true, pdf: bytes }, [bytes.buffer as ArrayBuffer]);
  } catch (error) {
    scope.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "排版失败",
    });
  }
};
