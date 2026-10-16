#!/usr/bin/env node
// Сканер пользовательских текстов To Dual Learn.
// Чистый Node 22+, без зависимостей. Правила лежат в проекте, внешний навык не нужен:
//   scripts/text-lint/cliches.md   (блоки ```lint  — списки фраз)
//   scripts/text-lint/ai-signs.md  (блоки ```lint-re — регулярки)
// Копии этих файлов лежат в навыке textskill (references/); правим здесь, навык обновляем вслед.
// Запуск: node scripts/text-lint.mjs [--json] [--no-warn] [--summary] [пути...]
// Код выхода: 1, если есть жёсткие нарушения; 0, если их нет; 2, если сканер не смог запуститься.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF_DIR = path.join(ROOT, "scripts/text-lint");
const RULE_FILES = ["cliches.md", "ai-signs.md"];

// ---------------------------------------------------------------- аргументы

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));

if (flags.has("--help") || flags.has("-h")) {
  console.log(`Сканер пользовательских текстов.

Использование: node scripts/text-lint.mjs [флаги] [файл или папка ...]

  без путей     проверяет src/**/*.ts(x), content/courses/*.json, docs/legal/*.md
  --json        вывод в JSON
  --no-warn     не печатать предупреждения (нарушения всё равно считаются)
  --summary     только сводка: числа, правила, топ файлов
  --top N       сколько файлов в топе (по умолчанию 10)
  --rules       список загруженных правил
  --help        эта справка

Код выхода 1, если есть жёсткие нарушения. Исключения: комментарий text-lint-ignore
на той же или предыдущей строке (в md: <!-- text-lint-ignore -->) или запись с причиной
в scripts/text-lint-allow.json (для JSON-курсов).`);
  process.exitCode = 0;
  process.exit();
}

const asJson = flags.has("--json");
const noWarn = flags.has("--no-warn");
const summaryOnly = flags.has("--summary");
const topIdx = argv.indexOf("--top");
const TOP_N = topIdx >= 0 ? Number(argv[topIdx + 1]) || 10 : 10;
if (topIdx >= 0) {
  const v = positional.indexOf(argv[topIdx + 1]);
  if (v >= 0) positional.splice(v, 1);
}

// ---------------------------------------------------------------- загрузка правил

const L = "\\p{L}\\p{N}";
const BEFORE = `(?<![${L}])`;
const AFTER = `(?![${L}])`;

/** ё → е, чтобы «ещё» и «еще» считались одним словом. Длина строки не меняется. */
const fold = (s) => s.replace(/ё/g, "е").replace(/Ё/g, "Е");

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseToRegex(phrase) {
  const tokens = fold(phrase.trim()).split(/\s+/).filter(Boolean);
  const body = tokens
    .map((t) => {
      const star = t.endsWith("*");
      const core = escapeRe(star ? t.slice(0, -1) : t);
      return star ? `${core}[${L}-]*` : core;
    })
    .join("\\s+");
  return new RegExp(`${BEFORE}${body}${AFTER}`, "giu");
}

function parseScopes(hintRaw) {
  const m = hintRaw.match(/\s@([a-z,]+)\s*$/);
  if (!m) return { hint: hintRaw.trim(), scopes: null };
  return { hint: hintRaw.slice(0, m.index).trim(), scopes: new Set(m[1].split(",")) };
}

function loadRules() {
  const rules = [];
  for (const name of RULE_FILES) {
    const file = path.join(REF_DIR, name);
    if (!fs.existsSync(file)) {
      throw new Error(`Нет файла правил: ${path.relative(ROOT, file)}`);
    }
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const head = lines[i].match(/^```(lint-re|lint)\s+(hard|warn)\s+(\S+)\s*(.*)$/);
      if (!head) continue;
      const [, kind, level, code, label] = head;
      for (i++; i < lines.length && lines[i].trim() !== "```"; i++) {
        const raw = lines[i].trim();
        if (!raw || raw.startsWith("#")) continue;
        const arrow = raw.indexOf(" => ");
        const patternPart = arrow >= 0 ? raw.slice(0, arrow) : raw;
        const { hint, scopes } = parseScopes(arrow >= 0 ? raw.slice(arrow + 4) : "");
        let caseSensitive = false;
        let rawText = false;
        let pattern = patternPart;
        if (pattern.startsWith("cs:")) {
          caseSensitive = true;
          pattern = pattern.slice(3).trim();
        } else if (pattern.startsWith("raw:")) {
          rawText = true;
          pattern = pattern.slice(4).trim();
        }
        try {
          if (kind === "lint") {
            for (const ph of pattern.split(" | ")) {
              if (!ph.trim()) continue;
              rules.push({ code, label, level, hint, scopes, re: phraseToRegex(ph), source: `${name}:${i + 1}`, text: ph.trim() });
            }
          } else {
            rules.push({
              code, label, level, hint, scopes,
              re: new RegExp(rawText ? pattern : fold(pattern), caseSensitive ? "gu" : "giu"),
              rawText, source: `${name}:${i + 1}`, text: pattern,
            });
          }
        } catch (e) {
          throw new Error(`Не разобрал правило ${name}:${i + 1}: ${e.message}`);
        }
      }
    }
  }
  return rules;
}

let RULES;
try {
  RULES = loadRules();
} catch (e) {
  console.error(`text-lint: ${e.message}`);
  process.exit(2);
}

if (flags.has("--rules")) {
  const by = new Map();
  for (const r of RULES) {
    const k = `${r.level} ${r.code} ${r.label}`;
    by.set(k, (by.get(k) ?? 0) + 1);
  }
  for (const [k, n] of by) console.log(`${k}  (${n})`);
  console.log("встроенные: HB09 является, HB14 тире, HB19 восклицания и эмодзи, HB20 тройки, S11, S45, S46, S49, S57, UX01-UX05");
  process.exit(0);
}

// ---------------------------------------------------------------- сбор фрагментов
// Фрагмент: { file, line, surface, text, lineAt(idx), kind }
// surface: ui | course | prompt | doc | legal

const CYR = /[А-Яа-яЁё]/;
const CYR_WORD = /[А-Яа-яЁё]{3,}/;
const UI_ATTRS = new Set(["title", "placeholder", "aria-label", "alt", "label", "description", "content", "text", "message", "error", "heading", "subtitle", "hint", "caption", "tooltip", "cta"]);
const UI_KEYS = new Set([...UI_ATTRS, "button", "summary", "body", "lead", "tagline", "name", "empty", "hero"]);

const IGNORE_PRAGMA = "text-lint-ignore";

function decodeEscapes(s) {
  return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (m, g) => {
    if (g[0] === "u" && g.length > 1) {
      const hex = g[1] === "{" ? g.slice(2, -1) : g.slice(1);
      return String.fromCodePoint(parseInt(hex, 16));
    }
    if (g[0] === "x" && g.length === 3) return String.fromCharCode(parseInt(g.slice(1), 16));
    if (g === "n") return "\n";
    if (g === "t") return "\t";
    if (g === "r") return "";
    if (g === "\n") return "";
    return g;
  });
}

/** Разбор TS/TSX: строковые литералы, шаблоны, комментарии; JSX-текст ищется по «маске». */
function extractTs(src, isTsx) {
  const n = src.length;
  const mask = src.split("");
  const literals = [];
  const ignoreLines = new Set();
  let line = 1;

  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (mask[k] !== "\n") mask[k] = " ";
  };

  function readString(i) {
    const q = src[i];
    const startLine = line;
    let j = i + 1;
    while (j < n && src[j] !== q && src[j] !== "\n") {
      if (src[j] === "\\") j++;
      j++;
    }
    const raw = src.slice(i + 1, j);
    literals.push({ raw, text: decodeEscapes(raw), line: startLine, start: i, template: false });
    blank(i, Math.min(j + 1, n));
    return src[j] === q ? j + 1 : j;
  }

  function readTemplate(i) {
    const startLine = line;
    let j = i + 1;
    let text = "";
    let segStart = i;
    while (j < n && src[j] !== "`") {
      if (src[j] === "\\") {
        text += src.slice(j, j + 2);
        if (src[j + 1] === "\n") line++;
        j += 2;
        continue;
      }
      if (src[j] === "$" && src[j + 1] === "{") {
        blank(segStart, j);
        text += "{}";
        j = scan(j + 2, true);
        segStart = j + 1;
        j += 1;
        continue;
      }
      if (src[j] === "\n") line++;
      text += src[j];
      j++;
    }
    blank(segStart, Math.min(j + 1, n));
    literals.push({ raw: text, text: decodeEscapes(text), line: startLine, start: i, template: true });
    return j + 1;
  }

  function scan(i, inExpr) {
    let depth = 0;
    let prev = "";
    while (i < n) {
      const c = src[i];
      const nx = src[i + 1];
      if (c === "\n") { line++; i++; continue; }
      if (c === "/" && nx === "/") {
        let j = i;
        while (j < n && src[j] !== "\n") j++;
        if (src.slice(i, j).includes(IGNORE_PRAGMA)) { ignoreLines.add(line); ignoreLines.add(line + 1); }
        blank(i, j);
        i = j;
        continue;
      }
      if (c === "/" && nx === "*") {
        let j = src.indexOf("*/", i + 2);
        j = j < 0 ? n : j + 2;
        const body = src.slice(i, j);
        if (body.includes(IGNORE_PRAGMA)) {
          const last = line + (body.match(/\n/g) ?? []).length;
          for (let k = line; k <= last + 1; k++) ignoreLines.add(k);
        }
        line += (body.match(/\n/g) ?? []).length;
        blank(i, j);
        i = j;
        continue;
      }
      if (c === '"' || c === "'") { i = readString(i); prev = '"'; continue; }
      if (c === "`") { i = readTemplate(i); prev = '"'; continue; }
      if (c === "/" && (prev === "" || "(,=:[!&|?{};>".includes(prev)) && !(isTsx && prev === ">")) {
        // литерал регулярного выражения
        let j = i + 1;
        let inClass = false;
        while (j < n && src[j] !== "\n") {
          if (src[j] === "\\") { j += 2; continue; }
          if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
        if (src[j] === "/") { blank(i, j + 1); i = j + 1; prev = ")"; continue; }
      }
      if (inExpr) {
        if (c === "{") depth++;
        else if (c === "}") {
          if (depth === 0) return i;
          depth--;
        }
      }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
    return i;
  }

  scan(0, false);
  const lineStarts = [0];
  for (let k = 0; k < n; k++) if (src[k] === "\n") lineStarts.push(k + 1);
  const lineOfOffset = (off) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };

  const jsx = [];
  if (isTsx) {
    const masked = mask.join("");
    const runs = [];
    const re = /[^<>{}]+/g;
    let m;
    while ((m = re.exec(masked))) {
      if (CYR.test(m[0])) runs.push({ s: m.index, e: m.index + m[0].length });
    }
    // склеиваем «Привет, {name}! Как дела» в один фрагмент
    const merged = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last) {
        const gap = masked.slice(last.e, r.s);
        if (/^\s*\{[^<>]*\}\s*$/.test(gap) || /^\s*\{[\s\S]*\}\s*$/.test(gap) && !gap.includes("<")) {
          last.e = r.e;
          last.parts.push({ s: r.s, e: r.e });
          continue;
        }
      }
      merged.push({ s: r.s, e: r.e, parts: [{ s: r.s, e: r.e }] });
    }
    for (const r of merged) {
      let text = "";
      for (let k = 0; k < r.parts.length; k++) {
        if (k > 0) text += " {} ";
        text += src.slice(r.parts[k].s, r.parts[k].e);
      }
      text = text.replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&quot;/g, '"');
      const lead = src.slice(r.s).match(/^\s*/)[0].length;
      jsx.push({ text: text.replace(/\s+/g, " ").trim(), line: lineOfOffset(r.s + lead), start: r.s });
    }
  }
  return { literals, jsx, ignoreLines, lineOfOffset };
}

function tsFragments(file, rel, surfaceBase) {
  const src = fs.readFileSync(file, "utf8");
  const isTsx = file.endsWith(".tsx");
  const { literals, jsx, ignoreLines } = extractTs(src, isTsx);
  const out = [];
  const isPrompt = surfaceBase === "prompt";

  for (const lit of literals) {
    if (!CYR_WORD.test(lit.text)) continue;
    const before = src.slice(Math.max(0, lit.start - 60), lit.start);
    if (/console\.\w+\(\s*$/.test(before)) continue;
    const textLine = (idx) => lit.line + (lit.template ? (lit.text.slice(0, idx).match(/\n/g) ?? []).length : 0);

    if (isPrompt) {
      const re = /«([^«»]{5,400})»/g;
      let m;
      while ((m = re.exec(lit.text))) {
        const inner = m[1];
        if (!CYR_WORD.test(inner)) continue;
        const at = m.index;
        const atLine = textLine(at);
        const after = lit.text.slice(at + m[0].length, at + m[0].length + 120).split("\n")[0];
        out.push({
          file: rel, line: atLine, surface: "prompt", kind: "prompt-example",
          text: inner, banned: banContextBefore(lit.text, at) || isBanContext(after),
          lineAt: () => atLine, ignored: ignoreLines.has(atLine),
        });
      }
      continue;
    }

    if (/<\/?[a-z][^>]*>/i.test(lit.text)) lit.text = lit.text.replace(/<[^>]*>/g, (t) => " ".repeat(t.length));
    const trimmed = lit.text.trim();
    const attrMatch = before.match(/([\w-]+)\s*=\s*\{?\s*$/);
    const keyMatch = before.match(/([\w$]+)\s*:\s*$/);
    const shortOk = (attrMatch && UI_ATTRS.has(attrMatch[1])) || (keyMatch && UI_KEYS.has(keyMatch[1]));
    if (trimmed.length <= 12 && !shortOk) continue;
    out.push({
      file: rel, line: lit.line, surface: surfaceBase, kind: "string",
      text: lit.text, banned: false, lineAt: textLine, ignored: ignoreLines.has(lit.line),
    });
  }
  for (const j of jsx) {
    if (!CYR.test(j.text)) continue;
    out.push({
      file: rel, line: j.line, surface: surfaceBase, kind: "jsx",
      text: j.text, banned: false, lineAt: () => j.line, ignored: ignoreLines.has(j.line),
    });
  }
  return out;
}

/** JSON: все строковые значения (не ключи) с номерами строк и путём. */
function jsonFragments(file, rel) {
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  let i = 0, line = 1;
  const n = src.length;
  const skipWs = () => { while (i < n && /\s/.test(src[i])) { if (src[i] === "\n") line++; i++; } };
  function str() {
    const startLine = line;
    let j = i + 1;
    while (j < n && src[j] !== '"') { if (src[j] === "\\") j++; j++; }
    const raw = src.slice(i, j + 1);
    i = j + 1;
    return { value: JSON.parse(raw), line: startLine };
  }
  function value(p) {
    skipWs();
    const c = src[i];
    if (c === '"') {
      const s = str();
      if (CYR_WORD.test(s.value)) {
        out.push({ file: rel, line: s.line, surface: "course", kind: "json", path: p, text: s.value, banned: false, lineAt: () => s.line, ignored: false });
      }
    } else if (c === "{") {
      i++;
      for (;;) {
        skipWs();
        if (src[i] === "}") { i++; break; }
        if (src[i] === ",") { i++; continue; }
        const k = str();
        skipWs(); i++; // :
        value(p ? `${p}.${k.value}` : k.value);
      }
    } else if (c === "[") {
      i++;
      let idx = 0;
      for (;;) {
        skipWs();
        if (src[i] === "]") { i++; break; }
        if (src[i] === ",") { i++; continue; }
        value(`${p}[${idx++}]`);
      }
    } else {
      while (i < n && !/[,\]}\s]/.test(src[i])) i++;
    }
  }
  value("");
  return out;
}

function cleanMdLine(s) {
  return s
    .replace(/`[^`]*`/g, (m) => " ".repeat(m.length))
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (m, t) => t + " ".repeat(m.length - t.length))
    .replace(/<[^>]+>/g, (m) => " ".repeat(m.length))
    .replace(/\*\*|__/g, "  ");
}

/** Markdown: абзацы, пункты списков, строки таблиц, заголовки. Код и front matter пропускаются. */
function mdFragments(file, rel, surface) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const out = [];
  let inFence = false;
  let cur = null;
  let inFront = false;
  const ignore = new Set();
  const listRuns = [];
  let run = [];

  const flush = () => {
    if (!cur) return;
    const text = cur.pieces.map((p) => p.t).join("");
    if (CYR_WORD.test(text)) {
      const pieces = cur.pieces;
      let acc = 0;
      const offs = pieces.map((p) => { const o = acc; acc += p.t.length; return { o, line: p.line }; });
      const lineAt = (idx) => {
        let ln = offs[0].line;
        for (const q of offs) if (q.o <= idx) ln = q.line;
        return ln;
      };
      out.push({ file: rel, line: pieces[0].line, surface, kind: cur.kind, text, banned: false, lineAt, ignored: ignore.has(pieces[0].line) });
    }
    cur = null;
  };
  const flushRun = () => {
    if (surface !== "legal" && run.length >= 4) {
      const first = run.map((r) => r.word);
      if (first.every((w) => w && w === first[0])) {
        out.push({ file: rel, line: run[0].line, surface, kind: "list-check", text: "", banned: false, lineAt: () => run[0].line, ignored: false, listWord: first[0], listLen: run.length });
      }
    }
    run = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const ln = i + 1;
    let raw = lines[i];
    if (i === 0 && raw.trim() === "---") { inFront = true; continue; }
    if (inFront) { if (raw.trim() === "---") inFront = false; continue; }
    if (/^\s*(```|~~~)/.test(raw)) { flush(); inFence = !inFence; continue; }
    if (inFence) continue;
    if (raw.includes(IGNORE_PRAGMA)) { ignore.add(ln); ignore.add(ln + 1); continue; }
    if (/^\s*<!--/.test(raw)) continue;
    if (!raw.trim()) { flush(); continue; }
    if (/^\s*\|?\s*:?-{2,}/.test(raw) && /^[\s|:\-]+$/.test(raw)) continue;
    if (/^\s*---+\s*$/.test(raw)) { flush(); continue; }
    raw = raw.replace(/^\s*>\s?/, "");
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush(); flushRun();
      cur = { kind: "heading", pieces: [{ t: cleanMdLine(heading[2]), line: ln }] };
      flush();
      continue;
    }
    if (/^\s*\|/.test(raw)) {
      flush();
      const cells = raw.trim().replace(/^\||\|$/g, "").split("|").map((c) => cleanMdLine(c.trim()));
      cur = { kind: "table", pieces: [{ t: cells.join("\n"), line: ln }] };
      flush();
      continue;
    }
    const item = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      const body = cleanMdLine(item[3]);
      cur = { kind: "list", pieces: [{ t: body, line: ln }] };
      run.push({ word: (body.match(/[\p{L}]+/u) ?? [""])[0].toLowerCase(), line: ln });
      continue;
    }
    if (cur) cur.pieces.push({ t: " " + cleanMdLine(raw.trim()), line: ln });
    else {
      flushRun();
      cur = { kind: "paragraph", pieces: [{ t: cleanMdLine(raw.trim()), line: ln }] };
    }
  }
  flush(); flushRun();
  return out;
}

// ---------------------------------------------------------------- проверка фрагментов

const BAN_RE = /(не\s+(?:пиши\p{L}*|писать|используй\p{L}*|употребляй\p{L}*|начинай\p{L}*|ставь\p{L}*|повторяй\p{L}*|заходи\p{L}*|говори\p{L}*|называй\p{L}*|пишите|используйте)|запрещ\p{L}*|запрет\p{L}*|нельзя|никогда|штамп\p{L}*|избегай\p{L}*|вместо|плох\p{L}*|нежелательн\p{L}*|канцелярит\p{L}*|маркер\p{L}*|стоп-слов\p{L}*|чего\s+не|не\s+так|ошибк\p{L}*|было\b|не\s+\p{L}{3,}(?:й|и|йте|ите)(?![\p{L}])|не\s*[«"]?\s*$|без\s*$)/iu;

function isBanContext(prefix) {
  return BAN_RE.test(prefix);
}

/** Контекст перед кавычкой: свой кусок строки (до 600 знаков) и предыдущая строка, если она заканчивается двоеточием. */
function banContextBefore(text, at) {
  const lineStart = text.lastIndexOf("\n", at - 1) + 1;
  let ctx = text.slice(Math.max(lineStart, at - 600), at);
  if (lineStart > 1) {
    const prevStart = text.lastIndexOf("\n", lineStart - 2) + 1;
    const prev = text.slice(prevStart, lineStart - 1);
    if (/:\s*$/.test(prev)) ctx = prev + " " + ctx;
  }
  return isBanContext(ctx);
}

function inBanQuote(text, idx) {
  const open = text.lastIndexOf("«", idx);
  if (open < 0) return false;
  const close = text.indexOf("»", open);
  if (close >= 0 && close < idx) return false;
  if (banContextBefore(text, open)) return true;
  const end = close < 0 ? text.length : close + 1;
  return isBanContext(text.slice(end, end + 120).split("\n")[0]);
}

const LEGAL_SOFT = new Set(["HB08", "HB09", "HB13", "HB14", "HB15", "HB20"]);

const ADJ = `[\\p{L}]{3,}(?:ый|ой|ая|яя|ое|ее|ые|[гкхжчшщ]ий|[гкхжчшщ]ие)`;
const ORDINAL = /^(?:перв|втор|трет|четв[её]рт|пят|шест|седьм|восьм|девят|десят|следующ|последн|одн|друг|как|так|ваш|наш|ихн)/iu;
const TRIPLE_ADJ = new RegExp(`${BEFORE}(${ADJ})\\s*,\\s*(${ADJ})\\s*(?:,\\s*|\\s+и\\s+|\\s+или\\s+)(${ADJ})${AFTER}`, "giu");
const ADV = `[\\p{L}]{3,}(?:но|ко|ло|ро|чо|хо|во|то|ее)`;
const TRIPLE_ADV = new RegExp(`${BEFORE}(${ADV})\\s*,\\s*(${ADV})\\s*(?:,\\s*|\\s+и\\s+)(${ADV})${AFTER}`, "giu");
const EMOJI_G = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{260F}\u{2613}-\u{2712}\u{2717}-\u{27BF}\u{2B50}\u{2B55}]/gu;

const words = (s) => s.match(/[\p{L}\p{N}]+/gu) ?? [];
const sentencesOf = (p) => p.split(/(?<=[.!?…])\s+(?=[\p{Lu}«"„(\d—–-])/u).map((x) => x.trim()).filter(Boolean);

function snippet(text, idx, len) {
  const s = Math.max(0, idx - 36);
  const e = Math.min(text.length, idx + len + 36);
  return (s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ").trim() + (e < text.length ? "…" : "");
}

function checkFragment(fr, violations) {
  if (fr.ignored) return;
  const surface = fr.surface;
  if (fr.kind === "list-check") {
    violations.push({ file: fr.file, line: fr.line, level: "warn", code: "S45", rule: "S45 пункты списка начинаются одинаково", match: fr.listWord, snippet: `${fr.listLen} пунктов подряд начинаются со слова «${fr.listWord}»`, hint: "разведите зачины: факт, вопрос, пример" });
    return;
  }
  if (fr.banned) return;
  const raw = fr.text;
  const text = fold(raw);
  const hits = [];
  const add = (code, label, level, hint, idx, len, extra = {}) => {
    if (surface === "legal" && level === "hard" && LEGAL_SOFT.has(code)) level = "warn";
    hits.push({ code, label, level, hint, idx, len, ...extra });
  };

  // списки фраз и регулярки из scripts/text-lint
  for (const r of RULES) {
    if (r.scopes && !r.scopes.has(surface)) continue;
    r.re.lastIndex = 0;
    let m;
    const subject = r.rawText ? raw : text;
    while ((m = r.re.exec(subject))) {
      if (m[0].length === 0) { r.re.lastIndex++; continue; }
      if (inBanQuote(text, m.index)) continue;
      add(r.code, r.label, r.level, r.hint, m.index, m[0].length);
    }
  }

  const paragraphs = [];
  {
    let off = 0;
    for (const p of text.split("\n")) { paragraphs.push({ t: p, off }); off += p.length + 1; }
  }

  // HB14: тире на месте точки, больше одного на абзац
  for (const p of paragraphs) {
    const dashes = [];
    const re = /(?<=[^\s])\s*—\s*(?=\S)|(?<=[\p{L}»)”"])\s[–-]\s(?=[\p{L}«„("])/gu;
    let m;
    while ((m = re.exec(p.t))) {
      const idx = m.index + m[0].indexOf(m[0].trim()[0] ?? "—");
      if (!inBanQuote(text, p.off + idx)) dashes.push(p.off + idx);
    }
    if (dashes.length > 1) {
      add("HB14", "тире больше одного на абзац", "hard", "замените запятой, двоеточием или точкой; «X — это Y» перестройте глаголом", dashes[1], 1, { extra: `${dashes.length} тире` });
    } else if (dashes.length === 1 && CYR_WORD.test(p.t)) {
      add("W31", "одно тире в абзаце", "warn", "проверьте, не заменяется ли оно точкой или запятой", dashes[0], 1);
    }
  }

  // HB09: «является» чаще одного раза на 500 слов
  {
    const re = /(?<![\p{L}])явля(?:ется|ются|лся|лась|лось|лись|ясь)(?![\p{L}])/giu;
    const found = [...text.matchAll(re)].filter((m) => !inBanQuote(text, m.index));
    if (found.length) {
      const total = words(text).length;
      const allowed = Math.max(1, Math.floor(total / 500));
      found.forEach((m, k) => {
        if (k >= allowed) add("HB09", "«является» чаще раза на 500 слов", "hard", "перестройте предложение: «курс бесплатный», а не «курс является бесплатным»", m.index, m[0].length);
        else add("W32", "«является»", "warn", "чаще всего заменяется глаголом или тире-связкой убирается", m.index, m[0].length);
      });
    }
  }

  // HB19: восклицательные знаки и эмодзи
  {
    const lvl = surface === "legal" || surface === "doc" ? "warn" : "hard";
    const re = /!+/g;
    let m;
    while ((m = re.exec(text))) {
      if (inBanQuote(text, m.index)) continue;
      add("HB19", "восклицательный знак", lvl, "точка; восторг по разнарядке читается как реклама", m.index, m[0].length);
    }
    EMOJI_G.lastIndex = 0;
    while ((m = EMOJI_G.exec(text))) {
      if (inBanQuote(text, m.index)) continue;
      add("HB19", "эмодзи", lvl, "уберите: в интерфейсе, письмах и разборах эмодзи нет", m.index, m[0].length);
    }
  }

  // HB20: тройки прилагательных (жёстко) и наречий (мягко)
  {
    TRIPLE_ADJ.lastIndex = 0;
    let m;
    while ((m = TRIPLE_ADJ.exec(text))) {
      if (m.slice(1, 4).some((w) => ORDINAL.test(w))) continue;
      if (inBanQuote(text, m.index)) continue;
      add("HB20", "тройка прилагательных", "hard", "оставьте одно точное слово или факт", m.index, m[0].length);
    }
    TRIPLE_ADV.lastIndex = 0;
    while ((m = TRIPLE_ADV.exec(text))) {
      if (m.slice(1, 4).some((w) => ORDINAL.test(w))) continue;
      if (inBanQuote(text, m.index)) continue;
      add("W33", "тройка однородных (наречия)", "warn", "оставьте одно точное слово или факт", m.index, m[0].length);
    }
  }

  // S46: модальные хеджи плотнее одного на 100 слов
  {
    const total = words(text).length;
    if (total >= 30) {
      const modal = [...text.matchAll(/(?<![\p{L}])(?:может|могут|способен|способна|способны|призван|призвана|призваны)(?![\p{L}])/giu)];
      if (modal.length >= 2 && modal.length / (total / 100) > 1) {
        add("S46", "модальные хеджи плотнее 1 на 100 слов", "warn", "утверждайте или назовите конкретное сомнение", modal[1].index, modal[1][0].length);
      }
    }
  }

  // S11: предложения одной длины; S49: цепочка из коротких
  if (surface !== "prompt") {
    for (const p of paragraphs) {
      const ss = sentencesOf(p.t);
      if (ss.length >= 5) {
        const lens = ss.map((s) => words(s).length);
        const mx = Math.max(...lens), mn = Math.min(...lens);
        const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
        if (mx - mn <= 5 && mean >= 9) add("S11", "предложения одной длины", "warn", "чередуйте короткое и длинное, объединяйте или делите по смыслу", p.off, Math.min(p.t.length, 60));
      }
      let streak = 0, startIdx = 0, pos = 0;
      for (const s of ss) {
        const k = p.t.indexOf(s, pos);
        pos = k + s.length;
        const wc = words(s).length;
        if (surface !== "legal" && wc >= 1 && wc <= 3 && /[.!]$/.test(s) && !/\d/.test(s)) {
          if (streak === 0) startIdx = k;
          streak++;
          if (streak === 3) add("S49", "цепочка коротких предложений", "warn", "верните нормальное предложение с причиной", p.off + startIdx, Math.min(60, pos - startIdx));
        } else streak = 0;
      }
    }
  }

  // S57: возможный обрыв длинного текста
  if ((surface === "course" || surface === "doc") && raw.length >= 160 && fr.kind !== "table") {
    const tail = raw.trim();
    if (sentencesOf(tail).length >= 2 && /[\p{L}\p{N},]$/u.test(tail) && !/\n/.test(tail)) {
      add("S57", "текст может обрываться на полуслове", "warn", "проверьте последнее предложение", Math.max(0, raw.length - 40), 40);
    }
  }

  // Правила интерфейса (только строки и JSX)
  if (surface === "ui") {
    const t = raw.trim().replace(/\s+/g, " ");
    const bare = t.replace(/[.…!?]+$/u, "").toLowerCase();
    if (fr.kind === "jsx" || t.length <= 25) {
      if (["ок", "далее", "подтвердить", "да", "нет", "отправить", "продолжить", "применить"].includes(bare)) {
        add("UX01", "кнопка не называет действие", "warn", "глагол с объектом: «Опубликовать урок», «Удалить материал»", 0, raw.length);
      }
    }
    if (/^(?:не удалось|не получилось|ошибка|что-то пошло не так|произошла ошибка)/i.test(t) && sentencesOf(t).length === 1 && !t.includes(":") && words(t).length <= 9) {
      add("UX02", "ошибка без второго шага", "warn", "что случилось и что сделать: «Файл больше 20 МБ. Сожмите его»", 0, Math.min(raw.length, 50));
    }
    if (/^(?:здесь пусто|нет данных|данных нет|ничего нет|пока пусто|пока ничего нет|ничего не найдено)\.?$/i.test(t)) {
      add("UX03", "пустое состояние без первого шага", "warn", "что здесь появится и что сделать сначала", 0, raw.length);
    }
    if (/^вы уверены\??$/i.test(t) || /^подтвердите действие\.?$/i.test(t)) {
      add("UX04", "подтверждение без последствия", "warn", "назовите цену нажатия: «Удалить курс? Результаты студентов пропадут»", 0, raw.length);
    }
    const dots = text.indexOf("...");
    if (dots >= 0) add("UX05", "три точки вместо многоточия", "warn", "используйте «…»", dots, 3);
  }

  // дедупликация пересечений: жёсткие и длинные побеждают
  hits.sort((a, b) => (b.level === "hard") - (a.level === "hard") || b.len - a.len || a.idx - b.idx);
  const taken = [];
  for (const h of hits) {
    if (taken.some((t) => h.idx < t.idx + t.len && t.idx < h.idx + h.len)) continue;
    taken.push(h);
  }
  for (const h of taken) {
    const lineNo = fr.lineAt(h.idx);
    violations.push({
      file: fr.file,
      line: lineNo,
      level: h.level,
      code: h.code,
      rule: `${h.code} ${h.label}`,
      match: raw.slice(h.idx, h.idx + h.len).replace(/\s+/g, " "),
      snippet: snippet(raw, h.idx, h.len),
      hint: h.hint,
      ...(fr.path ? { path: fr.path } : {}),
    });
  }
}

// ---------------------------------------------------------------- обход файлов

function walk(dir, filter, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, acc);
    else if (filter(p)) acc.push(p);
  }
  return acc;
}

const SKIP_TS = /(?:\.d\.ts|\.test\.tsx?|\.spec\.tsx?)$/;

function surfaceFor(rel) {
  if (/(^|\/)lib\/prompts\//.test(rel)) return "prompt";
  if (/(^|\/)lib\/ai\//.test(rel)) return "course";
  if (/(^|\/)docs\/legal\//.test(rel)) return "legal";
  if (rel.endsWith(".json")) return "course";
  if (rel.endsWith(".md")) return "doc";
  return "ui";
}

function defaultTargets() {
  return [
    ...walk(path.join(ROOT, "src"), (p) => /\.tsx?$/.test(p) && !SKIP_TS.test(p)),
    ...walk(path.join(ROOT, "content/courses"), (p) => p.endsWith(".json")),
    ...walk(path.join(ROOT, "docs/legal"), (p) => p.endsWith(".md")),
  ];
}

function explicitTargets() {
  const out = [];
  for (const a of positional) {
    const abs = path.resolve(process.cwd(), a);
    if (!fs.existsSync(abs)) { console.error(`text-lint: нет такого пути: ${a}`); process.exit(2); }
    if (fs.statSync(abs).isDirectory()) out.push(...walk(abs, (p) => /\.(tsx?|json|md)$/.test(p) && !SKIP_TS.test(p)));
    else out.push(abs);
  }
  return out;
}

const targets = (positional.length ? explicitTargets() : defaultTargets()).sort();
const violations = [];
let fragmentCount = 0;

for (const file of targets) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const surface = surfaceFor(rel);
  let frags = [];
  try {
    if (/\.tsx?$/.test(file)) frags = tsFragments(file, rel, surface);
    else if (file.endsWith(".json")) frags = jsonFragments(file, rel);
    else if (file.endsWith(".md")) frags = mdFragments(file, rel, surface);
  } catch (e) {
    console.error(`text-lint: не разобрал ${rel}: ${e.message}`);
    process.exit(2);
  }
  fragmentCount += frags.length;
  if (flags.has("--dump")) for (const f of frags) console.log(`${f.file}:${f.line} [${f.surface}/${f.kind}${f.banned ? "/ban" : ""}] ${f.text.replace(/\s+/g, " ").slice(0, 110)}`);
  for (const fr of frags) checkFragment(fr, violations);
}

// ---------------------------------------------------------------- отчёт

// Исключения: scripts/text-lint-allow.json, [{ file, code, match, reason }]. Причина обязательна.
let allow = [];
const allowFile = path.join(ROOT, "scripts/text-lint-allow.json");
if (fs.existsSync(allowFile)) {
  try {
    allow = JSON.parse(fs.readFileSync(allowFile, "utf8"));
    if (!Array.isArray(allow) || allow.some((x) => !x.file || !x.code || !x.reason)) throw new Error("нужен массив объектов с полями file, code, match, reason");
  } catch (e) {
    console.error(`text-lint: scripts/text-lint-allow.json: ${e.message}`);
    process.exit(2);
  }
}
let allowed = 0;
const isAllowed = (v) => allow.some((x) => x.file === v.file && x.code === v.code && v.match.toLowerCase().includes(String(x.match ?? "").toLowerCase()));

const seen = new Set();
const unique = violations.filter((v) => {
  if (isAllowed(v)) { allowed++; return false; }
  const k = `${v.file}:${v.line}:${v.code}:${v.match}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
}).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const hard = unique.filter((v) => v.level === "hard");
const warn = unique.filter((v) => v.level === "warn");

function tally(list, key) {
  const m = new Map();
  for (const v of list) m.set(key(v), (m.get(key(v)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const topFiles = tally(hard, (v) => v.file).slice(0, TOP_N);
const topWarnFiles = tally(warn, (v) => v.file).slice(0, TOP_N);
const byRuleHard = tally(hard, (v) => v.rule);
const byRuleWarn = tally(warn, (v) => v.rule);

if (asJson) {
  console.log(JSON.stringify({
    summary: {
      files: targets.length, fragments: fragmentCount, hard: hard.length, warn: warn.length, allowed,
      topFiles: topFiles.map(([file, count]) => ({ file, count })),
      hardByRule: Object.fromEntries(byRuleHard), warnByRule: Object.fromEntries(byRuleWarn),
    },
    violations: unique,
  }, null, 2));
} else {
  const tty = process.stdout.isTTY && !process.env.NO_COLOR;
  const red = (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s);
  const yel = (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s);
  if (!summaryOnly) {
    for (const v of unique) {
      if (v.level === "warn" && noWarn) continue;
      const tag = v.level === "hard" ? red("HARD") : yel("warn");
      console.log(`${v.file}:${v.line}  ${tag}  ${v.rule}\n    «${v.snippet}»\n    → ${v.hint}`);
    }
    if (unique.length) console.log("");
  }
  console.log(`Проверено: ${targets.length} файлов, ${fragmentCount} фрагментов текста.`);
  console.log(`Жёстких нарушений: ${hard.length}. Предупреждений: ${warn.length}.` + (allowed ? ` Скрыто исключениями: ${allowed}.` : ""));
  if (hard.length || summaryOnly) {
    console.log("\nЖёсткие по правилам:");
    for (const [k, c] of byRuleHard) console.log(`  ${String(c).padStart(4)}  ${k}`);
    console.log(`\nТоп файлов по жёстким нарушениям:`);
    for (const [k, c] of topFiles) console.log(`  ${String(c).padStart(4)}  ${k}`);
  }
  if (summaryOnly) {
    console.log("\nПредупреждения по правилам:");
    for (const [k, c] of byRuleWarn) console.log(`  ${String(c).padStart(4)}  ${k}`);
    console.log(`\nТоп файлов по предупреждениям:`);
    for (const [k, c] of topWarnFiles) console.log(`  ${String(c).padStart(4)}  ${k}`);
  }
}

process.exitCode = hard.length > 0 ? 1 : 0;
