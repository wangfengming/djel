import type { Grammar } from './types';

/**
 * priority:
 * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
 *
 * 10 || (logic or)
 * 20 && (logic and)
 * 30 == != (equality)
 * 40 <= < >= > in (compare)
 * 50 + - (add sub)
 * 60 * / // % (mul div rem)
 * 70 ^ (pow)
 * 80 | (pipe)
 * 90 ! + - (unary)
 * 100 [] . (member access)
 */

export const PIPE_PRIORITY = 80;
export const INDEX_PRIORITY = 100;

export const getGrammar = (): Grammar => ({
  symbols: {
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
  },
  binaryOp: {
    '.': {
      type: 'binaryOp',
      priority: 100,
      fn: (left, right) => left?.[right],
    },
    '+': {
      type: 'binaryOp',
      priority: 50,
      fn: (left, right) => left + right,
    },
    '-': {
      type: 'binaryOp',
      priority: 50,
      fn: (left, right) => left - right,
    },
    '*': {
      type: 'binaryOp',
      priority: 60,
      fn: (left, right) => left * right,
    },
    '/': {
      type: 'binaryOp',
      priority: 60,
      fn: (left, right) => left / right,
    },
    '//': {
      type: 'binaryOp',
      priority: 60,
      fn: (left, right) => Math.floor(left / right),
    },
    '%': {
      type: 'binaryOp',
      priority: 60,
      fn: (left, right) => left % right,
    },
    '^': {
      type: 'binaryOp',
      priority: 70,
      fn: (left, right) => Math.pow(left, right),
    },
    '==': {
      type: 'binaryOp',
      priority: 30,
      fn: (left, right) => left == right,
    },
    '!=': {
      type: 'binaryOp',
      priority: 30,
      fn: (left, right) => left != right,
    },
    '>': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left > right,
    },
    '>=': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left >= right,
    },
    '<': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left < right,
    },
    '<=': {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => left <= right,
    },
    '&&': {
      type: 'binaryOp',
      priority: 20,
      fn: (left, right) => left && right,
    },
    '||': {
      type: 'binaryOp',
      priority: 10,
      fn: (left, right) => left || right,
    },
    in: {
      type: 'binaryOp',
      priority: 40,
      fn: (left, right) => {
        if (typeof right === 'string') {
          return right.indexOf(left) !== -1;
        }
        if (Array.isArray(right)) {
          return right.some((i) => i == left);
        }
        return false;
      },
    },
  },
  unaryOp: {
    '!': {
      type: 'unaryOp',
      priority: 90,
      fn: (right) => !right,
    },
    '-': {
      type: 'unaryOp',
      priority: 90,
      fn: (right) => -right || 0,
    },
    '+': {
      type: 'unaryOp',
      priority: 90,
      fn: (right) => +right || 0,
    },
  },
  transforms: {},
});
