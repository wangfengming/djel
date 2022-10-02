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
 * 100 [] . () (member access/function call)
 */

export const PIPE_PRIORITY = 80;
export const MEMBER_PRIORITY = 100;
export const FUNCTION_CALL_PRIORITY = 100;

/**
 * A map of all expression elements to their properties.
 */
export const getGrammar = (): Grammar => ({
  symbols: {
    '[': { type: 'openBracket' },
    '?.[': { type: 'optionalBracket' },
    ']': { type: 'closeBracket' },
    '|': { type: 'pipe' },
    '{': { type: 'openCurly' },
    '}': { type: 'closeCurly' },
    '.': { type: 'dot' },
    '?.': { type: 'optionalDot' },
    ':': { type: 'colon' },
    ',': { type: 'comma' },
    '(': { type: 'openParen' },
    '?.(': { type: 'optionalParen' },
    ')': { type: 'closeParen' },
    '?': { type: 'question' },
    'def': { type: 'def' },
    '=': { type: 'assign' },
    ';': { type: 'semi' },
  },
  binaryOps: {
    '+': {
      priority: 50,
      fn: (left, right) => {
        if (Array.isArray(left)) return right == null ? left : left.concat(right);
        if (left && typeof left === 'object' || right && typeof right === 'object') {
          return { ...left, ...right };
        }
        return left + right;
      },
    },
    '-': {
      priority: 50,
      fn: (left, right) => left - right,
    },
    '*': {
      priority: 60,
      fn: (left, right) => left * right,
    },
    '/': {
      priority: 60,
      fn: (left, right) => left / right,
    },
    '//': {
      priority: 60,
      fn: (left, right) => Math.floor(left / right),
    },
    '%': {
      priority: 60,
      fn: (left, right) => left % right,
    },
    '^': {
      priority: 70,
      rtl: true,
      fn: (left, right) => Math.pow(left, right),
    },
    '==': {
      priority: 30,
      fn: (left, right) => (left === right || (left == null && right == null)),
    },
    '!=': {
      priority: 30,
      fn: (left, right) => (left !== right) && !(left == null && right == null),
    },
    '>': {
      priority: 40,
      fn: (left, right) => left > right,
    },
    '>=': {
      priority: 40,
      fn: (left, right) => left >= right,
    },
    '<': {
      priority: 40,
      fn: (left, right) => left < right,
    },
    '<=': {
      priority: 40,
      fn: (left, right) => left <= right,
    },
    '&&': {
      priority: 20,
      delay: true,
      fn: (left, right) => left && right(),
    },
    '||': {
      priority: 10,
      delay: true,
      fn: (left, right) => left || right(),
    },
    in: {
      priority: 40,
      fn: (left, right) => {
        if (typeof right === 'string') {
          return right.indexOf(left) !== -1;
        }
        if (Array.isArray(right)) {
          return right.some((i) => i === left);
        }
        return false;
      },
    },
  },
  unaryOps: {
    '!': {
      priority: 90,
      fn: (right) => !right,
    },
    '-': {
      priority: 90,
      fn: (right) => -right || 0,
    },
    '+': {
      priority: 90,
      fn: (right) => +right || 0,
    },
  },
  transforms: {},
});
