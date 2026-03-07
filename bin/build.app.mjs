#!/usr/bin/env bun
// build.app.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const DIST_DIR = 'dist';

const copyDir = async (src, dest) => {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

export const buildApp = async (distDir = DIST_DIR) => {
  await copyDir('src', path.join(distDir, 'src'));
  console.log('Copied src/');

  let html = await fs.readFile('index.html', 'utf-8');
  const injection = '<script>window.__STATIC_MODE__ = true;</script>\n  ';
  html = html.replace(
    '<script type="module" src="src/js/app.js"></script>',
    `${injection}<script type="module" src="src/js/app.js"></script>`
  );
  if (!html.includes('__STATIC_MODE__')) {
    throw new Error('Failed to inject __STATIC_MODE__ into index.html — script tag not found');
  }
  await fs.writeFile(path.join(distDir, 'index.html'), html);
  console.log('Copied and patched index.html');
};

const main = async () => {
  await fs.mkdir(DIST_DIR, { recursive: true });
  await buildApp();
  console.log(`\nApp build complete! Output: ${DIST_DIR}/`);
};

main().catch(e => { console.error(e); process.exit(1); });
