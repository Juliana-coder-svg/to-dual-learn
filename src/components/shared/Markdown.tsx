import { Fragment } from "react";

/** Минимальный рендер Markdown без зависимостей: заголовки, списки, абзацы, жирный, код, разделители. */

function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else out.push(<code key={k++} className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = ["text-xl font-semibold mt-6", "text-lg font-semibold mt-5", "text-base font-semibold mt-4", "text-sm font-semibold mt-3"][level - 1];
      blocks.push(<p key={key++} className={cls}>{inline(h[2])}</p>);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { blocks.push(<hr key={key++} className="my-4" />); i++; continue; }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(<ul key={key++} className="my-2 list-disc space-y-1 pl-6">{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(<ol key={key++} className="my-2 list-decimal space-y-1 pl-6">{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>);
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(<pre key={key++} className="my-3 overflow-x-auto rounded bg-muted p-3 text-sm">{code.join("\n")}</pre>);
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push(
        <table key={key++} className="my-3 w-full border-collapse text-sm">
          <tbody>{rows.map((r, ri) => <tr key={ri} className="border-b">{r.map((c, ci) => <td key={ci} className="px-2 py-1 align-top">{inline(c)}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,4}\s|\s*[-*]\s|\s*\d+[.)]\s|```|\|)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++} className="my-2 leading-relaxed">{para.map((p, j) => <Fragment key={j}>{inline(p)}{j < para.length - 1 ? <br /> : null}</Fragment>)}</p>);
  }
  return <div className="text-[15px]">{blocks}</div>;
}
