const esprima = require('esprima');
const walk = require('esprima-walk');

class ForbiddenModuleError extends Error {
  constructor(modules) {
    const prefix = `Forbidden ${modules.length > 1 ? 'modules' : 'module'}: `;
    const message = `${prefix}${modules.length > 1 ? modules.join(', ') : modules}`;
    super(message);
    this.name = 'ForbiddenModuleError';
  }
}

const isForbidden = (module) => {
  const forbiddenRequires =
    ['fs', 'child_process', 'path', 'os', 'http', 'https', 'net', 'tls', 'dns', 'url', 'util', 'vm']
    .map(module => [module, `${module}/promises`])
    .flat();

  return forbiddenRequires.includes(module);
}

const getVariables = (tokens) => {
  const variables = {};

  walk(tokens, node => {
    if (node.type === 'VariableDeclarator') {
      variables[node.id.name] = node.init.value;
    }
  });

  return variables;
}

const isRequire = (node) => {
  return node.type === 'CallExpression' && node.callee.name === 'require'
}

const hasLiteralArgument = (node) => {
  return node.arguments[0].type === 'Literal';
}

const hasIdentifierArgument = (node) => {
  return node.arguments[0].type === 'Identifier';
}

const walkRequires = (tokens, variables = {}, callback) => {
  walk(tokens, node => {
    if (isRequire(node) && hasLiteralArgument(node)) {
      callback(node.arguments[0].value);
    } else if (isRequire(node) && hasIdentifierArgument(node)) {
      callback(variables[node.arguments[0].name]);
    }
  });

  return tokens;
}

const hasForbiddenRequires = (tokens, variables = {}) => {
  let found = false;

  walkRequires(tokens, variables, module => {
    found = isForbidden(module);
  });

  return found;
}

const getForbiddenRequires = (tokens, variables = {}) => {
  const forbiddenRequires = [];

  walkRequires(tokens, variables, module => {
    if (isForbidden(module)) forbiddenRequires.push(module);
  });

  return forbiddenRequires;
}

const runExternalCode = (code) => {
  const tokens = esprima.parseScript(code, { range: true });
  const variables = getVariables(tokens);
  const hasForbidden = hasForbiddenRequires(tokens, variables);

  if (hasForbidden) {
    const forbiddenRequires = getForbiddenRequires(tokens, variables);
    throw new ForbiddenModuleError(forbiddenRequires);
  }

  console.log(eval(code));
}

module.exports = {
  run: runExternalCode
}
