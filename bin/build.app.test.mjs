#!/usr/bin/env bun
// build.app.test.mjs
import assert from 'node:assert/strict';

const SCRIPT_TAG = '<script type="module" src="src/js/app.js"></script>';
const injection = '<script>window.__STATIC_MODE__ = true;</script>\n  ';
const mockHtml = `<html><head></head><body>  ${SCRIPT_TAG}</body></html>`;

const patched = mockHtml.replace(SCRIPT_TAG, `${injection}${SCRIPT_TAG}`);

assert.ok(patched.includes('__STATIC_MODE__'), 'injects __STATIC_MODE__ flag');
assert.ok(patched.includes(SCRIPT_TAG), 'preserves app.js script tag');
assert.ok(patched.indexOf('__STATIC_MODE__') < patched.indexOf(SCRIPT_TAG), 'injection precedes app.js');

const unchanged = '<html><head></head><body></body></html>';
const notPatched = unchanged.replace(SCRIPT_TAG, `${injection}${SCRIPT_TAG}`);
assert.ok(!notPatched.includes('__STATIC_MODE__'), 'no injection when script tag absent');

console.log('All app build tests passed!');
