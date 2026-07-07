import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: true,
    external: ["modal", "next", "react"],
  },
  {
    entry: { server: "src/server.ts" },
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: false,
    external: ["modal"],
  },
  {
    entry: { react: "src/react.ts" },
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: false,
    external: ["react"],
    banner: { js: '"use client";' },
  },
  {
    entry: { next: "src/next.ts" },
    format: ["cjs", "esm"],
    dts: true,
    outDir: "dist",
    clean: false,
    external: ["next", "modal"],
  },
]);
