// Загрузчик для запуска модулей из src/ напрямую в node, без dev-сервера:
//   node --import ./scripts/register.mjs scripts/<скрипт>.ts
// Разрешает «@/x» в <repo>/src/x, относительные импорты без расширения дополняет .ts/.tsx/index.ts,
// а голые имена пакетов без поля exports (next/headers) повторяет с «.js».
// Типы вырезает сам node (22.18+ и новее), поэтому enum и namespace в src/ не используем.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL(new URL("./loader-hooks.mjs", import.meta.url).pathname));
