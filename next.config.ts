import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Второй dev-сервер в той же папке (например, прогон на другом порту с тестовой базой)
  // поднимается с отдельной папкой сборки, иначе Next держит общий lock в .next/dev.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Для Docker (Selectel): самодостаточная сборка в .next/standalone. На Vercel переменная не задана.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: [],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
