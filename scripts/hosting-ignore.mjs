import { execFileSync } from "node:child_process";

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA1 || process.env.CACHED_COMMIT_REF;
const current = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF;

// First deployment or a provider without commit metadata must build.
if (!previous || !current) process.exit(1);

let changed;
try {
  changed = execFileSync("git", ["diff", "--name-only", previous, current], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
} catch {
  process.exit(1);
}

const nonDeployFiles = [
  /^AGENTS\.md$/i,
  /^README(?:-[^/]+)?\.md$/i,
  /^PLAN-[^/]+\.md$/i,
  /^RESULTADOS-[^/]+\.md$/i,
  /^ESTADO-[^/]+\.md$/i,
  /^tests\//i,
  /^tests\/screenshots\//i,
  /\.tar\.gz$/i,
  /\.log$/i,
  /^prod-orders\.json$/i,
  /^tsconfig\.tsbuildinfo$/i,
];

const onlyNonDeployFiles = changed.length > 0 && changed.every((file) => nonDeployFiles.some((pattern) => pattern.test(file)));
console.log(onlyNonDeployFiles ? "Solo cambios auxiliares; se omite el despliegue." : "Hay cambios de aplicación; se continúa con el despliegue.");
process.exit(onlyNonDeployFiles ? 0 : 1);
