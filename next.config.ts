import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Второй dev-сервер в той же папке (например, прогон на другом порту с тестовой базой)
  // поднимается с отдельной папкой сборки, иначе Next держит общий lock в .next/dev.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: [],
  // Страницы /legal читают docs/legal/*.md на сборке. Если их когда-нибудь сделают динамическими,
  // файлы должны попасть в функцию Vercel.
  outputFileTracingIncludes: { "/legal/[doc]": ["./docs/legal/*.md"] },
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
