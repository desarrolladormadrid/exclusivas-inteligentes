import fs from "node:fs/promises";
import path from "node:path";
import runtime from "../../dist/server/index.js";

// Netlify bundles functions into a different directory; the deployment root is
// the stable location for the included build output and public assets.
const projectRoot = process.cwd();
const clientRoot = path.join(projectRoot, "dist", "client");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function assetPath(requestPath) {
  const relative = decodeURIComponent(requestPath).replace(/^\/+/, "");
  const candidate = path.resolve(clientRoot, relative);
  return candidate.startsWith(`${clientRoot}${path.sep}`) ? candidate : null;
}

const assets = {
  async fetch(request) {
    const file = assetPath(new URL(request.url).pathname);
    if (!file) return new Response("Not found", { status: 404 });
    try {
      const body = await fs.readFile(file);
      return new Response(body, {
        headers: {
          "content-type": contentTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};

export default async function app(request, context) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/favicon")) {
    return assets.fetch(request);
  }
  const executionContext = {
    waitUntil: typeof context?.waitUntil === "function" ? context.waitUntil.bind(context) : () => {},
    passThroughOnException: typeof context?.passThroughOnException === "function" ? context.passThroughOnException.bind(context) : () => {},
  };
  return runtime.fetch(request, { ASSETS: assets }, executionContext);
}
