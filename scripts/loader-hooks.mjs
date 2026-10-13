import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

function withExt(p) {
  for (const c of [p, `${p}.ts`, `${p}.tsx`, path.join(p, "index.ts")]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

const hasExt = (s) => /\.(m?[jt]sx?|json)$/.test(s);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const p = withExt(path.join(SRC, specifier.slice(2)));
    if (p) return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  if (!hasExt(specifier) && (specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const p = withExt(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier));
    if (p) return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  try {
    return await next(specifier, context);
  } catch (e) {
    if (e?.code === "ERR_MODULE_NOT_FOUND" && !hasExt(specifier) && !specifier.startsWith(".")) return next(`${specifier}.js`, context);
    throw e;
  }
}
