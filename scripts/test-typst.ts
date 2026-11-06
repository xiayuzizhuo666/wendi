import fs from "node:fs";
import { createTypstCompiler, initOptions, loadFonts } from "@myriaddreamin/typst.ts";
import { SAMPLES, getSample } from "../data/samples";
import { renderTypst } from "../lib/typst/render";

const wasm = fs.readFileSync("node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm");
const serif = fs.readFileSync("public/fonts/WendiSerif-Regular.ttf");
const sans = fs.readFileSync("public/fonts/WendiSans-SemiBold.ttf");
const compiler = createTypstCompiler();
await compiler.init({
  getModule: () => wasm,
  beforeBuild: [initOptions.disableDefaultFontAssets(), loadFonts([new Uint8Array(serif), new Uint8Array(sans)])],
});

for (const entry of SAMPLES) {
  const source = renderTypst(entry.report);
  fs.writeFileSync(`scripts/out-${entry.slug}.typ`, source, "utf8");
  compiler.addSource("/main.typ", source);
  const result = await compiler.compile({ mainFilePath: "/main.typ", format: 1, diagnostics: "full" });
  if (result.diagnostics && result.diagnostics.length) console.log(entry.slug, "DIAG", JSON.stringify(result.diagnostics).slice(0, 2000));
  if (!result.result) throw new Error(`no pdf for ${entry.slug}`);
  fs.writeFileSync(`scripts/out-${entry.slug}.pdf`, result.result);
  console.log(entry.slug, "PDF bytes", result.result.length);
}
