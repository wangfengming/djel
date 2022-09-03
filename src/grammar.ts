import type { Grammar } from './types';

export const getGrammar = (): Grammar => ({
  elements: {
    '[': { type: 'openBracket' },
    ']': { type: 'closeBracket' },
    '|': { type: 'pipe' },
    '{': { type: 'openCurly' },
    '}': { type: 'closeCurly' },
    ':': { type: 'colon' },
    ',': { type: 'comma' },
    '(': { type: 'openParen' },
    ')': { type: 'closeParen' },
    '?': { type: 'question' },
    '.': {
      type: 'binaryOp',
      priority: Infinity,
      fn: (left, right) => left?.[right],
    },
    '+': {
      type: 'binaryOp',
      priority: 30,
      fn: (left, right) => left + right,
    },
    '-': {
      type: 'binaryOp',
      priority: 30,
      fn: (left, right) => left - right,
    },
    '*': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left * right,
    },
    '/': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left / right,
    },
    '//': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => Math.floor(left / right),
    },
    '%': {
      type: 'binaryOp',
      priority: 50,
      fn: (left, right) => left % right,
    },
    '^': {
      type: 'binaryOp',
      priority: 50,
      fn: (left, right) => Math.pow(left, right),
    },
    '==': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left == right,
    },
    '!=': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left != right,
    },
    '>': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left > right,
    },
    '>=': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left >= right,
    },
    '<': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left < right,
    },
    '<=': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left <= right,
    },
    '&&': {
      type: 'binaryOp',
      priority: 10,
      fn: (left, right) => left && right,
    },
    '||': {
      type: 'binaryOp',
      priority: 10,
      fn: (left, right) => left || right,
    },
    in: {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => {
        if (typeof right === 'string') return right.indexOf(left) !== -1;
        if (Array.isArray(right)) {
          return right.some((i) => i == left);
        }
        return false;
      },
    },
    '!': {
      type: 'unaryOp',
      priority: 1000,
      fn: (right) => !right,
    },
  },
  transforms: {},
});
