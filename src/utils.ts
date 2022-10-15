import type { AstNode, LambdaNode } from './types';
import { AstNodeType } from './types';

export function maybeLambda(ast: AstNode) {
  return ast._lambda
    ? { type: AstNodeType.Lambda, expr: ast } as LambdaNode
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
