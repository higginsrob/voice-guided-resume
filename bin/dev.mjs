#!/usr/bin/env bun
import path from 'node:path';

const root = path.resolve(import.meta.dir, '../dist');
const preferredPort = Number(process.env.PORT) || 8080;

const fetch = async (req) => {
  const url = new URL(req.url);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (pathname === '') pathname = '/index.html';

  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return new Response('Forbidden', { status: 403 });
  }

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }

  return new Response('Not Found', { status: 404 });
};

let server;
for (let port = preferredPort; port < preferredPort + 20; port++) {
  try {
    server = Bun.serve({ port, fetch });
    break;
  } catch (err) {
    if (err?.code !== 'EADDRINUSE') throw err;
  }
}

if (!server) {
  console.error(`Could not bind a port near ${preferredPort}`);
  process.exit(1);
}

console.log(`Serving ${root} at http://localhost:${server.port}`);
