import { build } from "esbuild";
import { cp, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = resolve(root, ".next/standalone");
await access(resolve(target, "server.js"));
await mkdir(resolve(target, "scripts"), { recursive: true });
await build({
  entryPoints: [resolve(root, "scripts/manage.ts")],
  outfile: resolve(target, "scripts/manage.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: false,
  minify: false,
});
await cp(resolve(root, "migrations"), resolve(target, "migrations"), {
  recursive: true,
});
await cp(resolve(root, ".next/static"), resolve(target, ".next/static"), {
  recursive: true,
});
console.log(
  "Packaged standalone database CLI, SQL migrations and static assets.",
);
