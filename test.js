const assert = require('node:assert');
const { 
  parseExternalCode,
  hasForbiddenRequires,
  hasInfiniteLoops
} = require('./index.js');

const unsafeRequires = [
  "require('fs')",
  "require('fs/promises')",
  "require('node:fs')",
  "require('node:fs/promises')",
  "require('f' + 's')",
  "require('p' + 'at' + 'h')",
  "let x = 'fs'; require(x)",
  "let x = 'f'; let y = 's'; require(x+y)",
  "let f = () => 'fs'; require(f())",
  "let x = { y : require }; x.y('fs')",
  "let x = { y : require }; x['y']('fs')",
  "let x = require; x('fs')",
  "require('FS'.toLowerCase())",
  "require(false ? 'fs' : 'fs')",
  "eval('require(\"fs\")')",
  "eval('require(\"fs/promises\")')",
  "eval('require(\"node:fs\")')",
  "eval('require(\"node:fs/promises\")')",
  "eval('require(\"f\" + \"s\")')",
  "eval('let x = \"fs\"; require(x)')",
  "eval('let x = \"f\"; let y = \"s\"; require(x+y)')",
  "eval('let f = () => \"fs\"; require(f())')",
  "eval('require(\"FS\".toLowerCase())')",
  "eval('require(\"p\" + \"at\" + \"h\")')",
  "eval('let x = { y : require }; x.y(\"fs\")')",
  "eval('let x = { y : require }; x[\"y\"](\"fs\")')",
  "eval('let x = require; x(\"fs\")')",
  "eval('require(false ? \"fs\" : \"fs\")')",
];

const infiniteWhiles = [
  "while (true) { }",
  "while (1) { }",
  "let x = true; while (x) { }",
  "let x = 1; while (x) { }",
  "let x = 1; let y = 1; while (x+y) { }",
  "while (1 > 0) { }",
  "eval('while (true) { }')",
  "eval('while (1) { }')",
  "eval('let x = true; while (x) { }')",
  "eval('let x = 1; while (x) { }')",
  "eval('let x = 1; let y = 1; while (x+y) { }')",
  "eval('while (1 > 0) { }')",
]

const infiniteFors = [
  "for (;;) { }",
  "for (;true;) { }",
  "for (;1;) { }",
  "for (let i = 0; i < 1; i++) { }",
  "let x = true; for (;x;) { }",
  "let x = 1; for (;x;) { }",
  "let x = 1; let y = 1; for (;x+y;) { }",
  "eval('for (;;) { }')",
  "eval('for (;true;) { }')",
  "eval('for (;1;) { }')",
  "eval('for (let i = 0; i < 1; i++) { }')",
  "eval('let x = true; for (;x;) { }')",
  "eval('let x = 1; for (;x;) { }')",
];

const unsafeCases = [
  ...unsafeRequires,
  ...infiniteWhiles,
  ...infiniteFors,
]

const hasUnsafe = (metadata) => {
  return hasForbiddenRequires(metadata) || hasInfiniteLoops(metadata);
}

const unsafeCount = 
  unsafeCases
  .map(parseExternalCode)
  .map(hasUnsafe)
  .filter(Boolean)
  .length;

assert.equal(unsafeCases.length, unsafeCount);
