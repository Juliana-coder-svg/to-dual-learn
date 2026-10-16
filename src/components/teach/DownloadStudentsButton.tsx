"use client";

import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/homework/csv";

/** Таблица студентов в CSV: «;» и BOM, чтобы Excel открыл кириллицу. Строки готовит сервер. */
export function DownloadStudentsButton({ rows, filename }: { rows: (string | number)[][]; filename: string }) {
  function download() {
    const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="outline" size="sm" onClick={download}>Скачать CSV</Button>;
}
