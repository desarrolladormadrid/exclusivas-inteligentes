import { Readable } from "node:stream";

function normalizedPath(requestUrl, prefix) {
  const url = new URL(requestUrl);
  const functionPrefix = `/.netlify/functions/${prefix}`;
  if (url.pathname === functionPrefix) url.pathname = `/${prefix}`;
  else if (url.pathname.startsWith(`${functionPrefix}/`)) {
    url.pathname = `/${prefix}${url.pathname.slice(functionPrefix.length)}`;
  }
  return `${url.pathname}${url.search}`;
}

export async function netlifyRequestToNode(request, prefix = "api") {
  const body = request.method === "GET" || request.method === "HEAD"
    ? Buffer.alloc(0)
    : Buffer.from(await request.arrayBuffer());
  const stream = Readable.from(body.length ? [body] : []);
  stream.method = request.method;
  stream.url = normalizedPath(request.url, prefix);
  stream.headers = Object.fromEntries(request.headers.entries());
  return stream;
}

export function createNodeResponse() {
  let statusCode = 200;
  const headers = new Headers();
  let body = Buffer.alloc(0);
  let resolveFinished;
  const finished = new Promise((resolve) => { resolveFinished = resolve; });

  const response = {
    get statusCode() { return statusCode; },
    set statusCode(value) { statusCode = Number(value) || 200; },
    setHeader(name, value) { headers.set(name, Array.isArray(value) ? value.join(", ") : String(value)); },
    writeHead(status, values = {}) {
      statusCode = Number(status) || 200;
      for (const [name, value] of Object.entries(values)) this.setHeader(name, value);
    },
    end(value = "") {
      body = Buffer.isBuffer(value) ? value : Buffer.from(value ?? "");
      const responseBody = statusCode === 204 || statusCode === 304 ? null : body;
      resolveFinished(new Response(responseBody, { status: statusCode, headers }));
    },
  };

  return { response, finished };
}
