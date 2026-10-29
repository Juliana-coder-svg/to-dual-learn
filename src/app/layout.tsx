import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";

/** Шрифт платформы: Onest с кириллицей (решение владельца от 8 октября 2026). Системный шрифт остаётся запасным в globals.css. */
const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TO DUAL Learn", template: "%s · TO DUAL Learn" },
  description:
    "Преподаватель загружает материалы, сервис собирает из них короткие уроки, студенты учатся по 5 минут в день.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
