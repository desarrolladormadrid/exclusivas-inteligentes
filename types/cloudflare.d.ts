declare module "cloudflare:workers" {
  export const env: { DB?: any };
}

declare global {
  type Fetcher = {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };

  type D1Database = any;
}

export {};
