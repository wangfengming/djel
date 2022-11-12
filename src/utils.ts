import type { AstNode, FunctionNode } from './types';
import { AstNodeType } from './types';

export function maybeLambda(ast: AstNode) {
  return ast._lambda
    ? { type: AstNodeType.Function, expr: ast } as FunctionNode
    : ast;
}

export function set(obj: any, key: string, v: any) {
  Object.defineProperty(obj, key, { value: v, writable: true });
}

export function last<T>(a: T[]) {
  return a[a.length - 1];
}

export function hasOwn(o: any, key: string) {
  return Object.prototype.hasOwnProperty.call(o, key);
}

export const arrayFrom = Array.from || ((a: any) => {
  if (Array.isArray(a)) return a;
  const result: any[] = [];
  for (let i = 0, len = a.length; i < len; i++) {
    result.push(a[i]);
  }
  return result;
});
