"use client";

import { Button } from "@/components/ui/button";
import type { HomeworkResults } from "@/lib/lessons/types";
import { toCsv } from "@/lib/homework/csv";

export function DownloadResultsButton({ results }: { results: HomeworkResults }) {
  function download() {
    const rows: (string | number)[][] = [["Студент", "Балл", "Критерии выполнены", "Отметки", "Комментарий"]];
    for (const r of results.results) {
      rows.push([r.student, r.score, `${r.criteria.filter((c) => c.met).length}/${r.criteria.length}`, r.flags.join("; "), r.feedback]);
    }
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "homework-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="outline" size="sm" onClick={download}>Скачать CSV</Button>;
}
