const assert = require('node:assert');
const { parseExternalCode, hasForbiddenRequires } = require('./index.js');

const unsafeCases = [
  "require('fs').rmdir('../', { recursive: true }, () => { /**/ })",
  "require('fs/promises').rmdir('../', { recursive: true }, () => { /**/ })",
  "require('node:fs').rmdir('../', { recursive: true }, () => { /**/ })",
  "require('node:fs/promises').rmdir('../', { recursive: true }, () => { /**/ })",
  "require('f' + 's').rmdir('../', { recursive: true }, () => { /**/ })",
  "let x = 'fs'; require(x).rmdir('../', { recursive: true }, () => { /**/ })",
  "let f = () => 'fs'; require(f()).rmdir('../', { recursive: true }, () => { /**/ })",
  "require('FS'.toLowerCase()).rmdir('../', { recursive: true }, () => { /**/ })",
  "eval('require(\"fs\").rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('require(\"fs/promises\").rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('require(\"node:fs\").rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('require(\"node:fs/promises\").rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('require(\"f\" + \"s\").rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('let x = \"fs\"; require(x).rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('let f = () => \"fs\"; require(f()).rmdir(\"../\", { recursive: true }, () => { /**/ })')",
  "eval('require(\"FS\".toLowerCase()).rmdir(\"../\", { recursive: true }, () => { /**/ })')",
];

const unsafeCount = 
  unsafeCases
  .map(parseExternalCode)
  .map(hasForbiddenRequires)
  .filter(Boolean)
  .length;

assert.equal(unsafeCases.length, unsafeCount);
