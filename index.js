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

const BINARY_OPS = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
}

const isForbidden = (module) => {
  const forbiddenRequires =
    ['fs', 'child_process', 'path', 'os', 'http', 'https', 'net', 'tls', 'dns', 'url', 'util', 'vm']
    .map(module => [module, `${module}/promises`, `node:${module}`, `node:${module}/promises`])
    .flat();

  return forbiddenRequires.includes(module) || module === 'unknown';
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

const parseExternalCode = (code) => {
  const tokens = esprima.parseScript(code, { range: true });
  const variables = getVariables(tokens);

  return { tokens, variables };
}

const parseBinaryExpressionValues = (expression, variables) => {
  const left =
    expression.left.type === 'Literal'
      ? expression.left.value
      : (expression.type === 'Identifier'
        ? variables[expression.left.name] 
        : parseBinaryExpressionValues(expression.left, variables));

  const right = 
    expression.right.type === 'Literal' 
    ? expression.right.value 
    : (expression.type === 'Identifier' 
      ? variables[expression.right.name]
      : parseBinaryExpressionValues(expression.right, variables));

  return BINARY_OPS[expression.operator](left, right);
}


const isRequire = (node) => {
  return node.type === 'CallExpression' && node.callee.name === 'require'
}

const isEval = (node) => {
  return node.type === 'CallExpression' && node.callee.name === 'eval'
}

const hasLiteralArgument = (node) => {
  return node.arguments[0].type === 'Literal';
}

const hasIdentifierArgument = (node) => {
  return node.arguments[0].type === 'Identifier';
}

const hasBinaryExpressionArgument = (node) => {
  return node.arguments[0].type === 'BinaryExpression';
}

const hasCallExpressionArgument = (node) => {
  return node.arguments[0].type === 'CallExpression';
}

const walkRequires = (tokens, variables = {}, callback) => {
  walk(tokens, node => {
    if (isRequire(node) && hasLiteralArgument(node)) {
      callback(node.arguments[0].value);
    } else if (isRequire(node) && hasIdentifierArgument(node)) {
      callback(variables[node.arguments[0].name]);
    } else if (isRequire(node) && hasBinaryExpressionArgument(node)) {
      const expression = node.arguments[0];
      const result = parseBinaryExpressionValues(expression, variables);
      callback(result);
    } else if (isRequire(node) && hasCallExpressionArgument(node)) {
      // if the argument for require is a CallExpression, e.g require(fn())
      // just hardcode a forbidden module
      // TODO: parse the code inside the CallExpression
      callback('unknown');
    }
  });

  return tokens;
}

const walkEvals = (tokens, variables = {}, callback) => {
  walk(tokens, node => {
    if (isEval(node) && hasLiteralArgument(node)) {
      callback(node.arguments[0].value);
    } else if (isEval(node) && hasIdentifierArgument(node)) {
      callback(variables[node.arguments[0].name]);
    } else if (isEval(node) && hasBinaryExpressionArgument(node)) {
      const expression = node.arguments[0];
      const result = parseBinaryExpressionValues(expression, variables);
      callback(result);
    } else if (isEval(node) && hasCallExpressionArgument(node)) {
      // if the argument for eval is a CallExpression, e.g eval(fn())
      // just hardcode a forbidden module
      // TODO: parse the code inside the CallExpression
      callback('require("fs")');
    }
  });
}

const hasForbiddenRequires = ({ tokens, variables }) => {
  let found = false;

  walkRequires(tokens, variables, module => {
    found = isForbidden(module);
  });

  walkEvals(tokens, variables, code => {
    const { tokens, variables } = parseExternalCode(code);
    found = hasForbiddenRequires({ tokens, variables });
  });

  return found;
}

const getForbiddenRequires = ({ tokens, variables }) => {
  const forbiddenRequires = [];

  walkRequires(tokens, variables, module => {
    if (isForbidden(module)) forbiddenRequires.push(module);
  });

  walkEvals(tokens, variables, code => {
    console.log(code);
    const { tokens, variables } = parseExternalCode(code);
    const hasForbidden = hasForbiddenRequires({ tokens, variables });
    if (hasForbidden) forbiddenRequires.push(...getForbiddenRequires({ tokens, variables }));
  });

  return forbiddenRequires;
}

const runExternalCode = (code) => {
  const { tokens, variables } = parseExternalCode(code);
  const hasForbidden = hasForbiddenRequires({ tokens, variables });

  if (hasForbidden) {
    const forbiddenRequires = getForbiddenRequires({ tokens, variables });
    throw new ForbiddenModuleError(forbiddenRequires);
  }

  console.log(eval(code));
}

module.exports = {
  parseExternalCode,
  hasForbiddenRequires,
  run: runExternalCode
}
