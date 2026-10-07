/** Работы в формате "## Имя\nтекст". Если заголовков нет - вся вставка считается одной работой. */
export function parseWorks(text: string): { student: string; answer: string }[] {
  const parts = text.replace(/\r\n/g, "\n").split(/^##\s+/m).map((p) => p.trim()).filter(Boolean);
  if (!/^##\s+/m.test(text)) return text.trim() ? [{ student: "Студент", answer: text.trim() }] : [];
  return parts.map((p, i) => {
    const nl = p.indexOf("\n");
    const student = (nl === -1 ? p : p.slice(0, nl)).trim() || `Студент ${i + 1}`;
    const answer = nl === -1 ? "" : p.slice(nl + 1).trim();
    return { student, answer };
  });
}
