import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "To Dual Learn",
  description:
    "Короткие уроки из материалов преподавателя. Студенты учатся по 5 минут в день.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
