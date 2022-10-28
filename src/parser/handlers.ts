import type { Parser } from './index';
import type {
  ArrayNode,
  AstNode,
  BinaryNode,
  ConditionalNode,
  Def,
  FunctionCallNode,
  IdentifierNode,
  MemberNode,
  ObjectEntry,
  ObjectNode,
  Token,
  UnaryNode,
} from '../types';
import { AstNodeType, TokenType } from '../types';
import { FUNCTION_CALL_PRIORITY, MEMBER_PRIORITY, PIPE_PRIORITY } from '../grammar';
import { last, maybeLambda } from '../utils';

/**
 * 创建 Literal 节点。
 */
export function tokenLiteral(this: Parser, token: Token) {
  this.placeAtCursor({ type: AstNodeType.Literal, value: token.literal! });
}

/**
 * 创建 Identifier 节点。如果 token 是 @，表示是简写 lambda 函数的参数。
 */
export function tokenIdentifier(this: Parser, token: Token) {
  const identifier = token.value;
  const node = { type: AstNodeType.Identifier, value: identifier } as IdentifierNode;
  if (token.argIndex !== undefined) {
    node.argIndex = token.argIndex;
    this._lambda = true;
  }
  this.placeAtCursor(node);
}

/**
 * 创建 Unary 节点
 */
export function tokenUnaryOp(this: Parser, token: Token) {
  this.placeAtCursor({
    type: AstNodeType.Unary,
    operator: token.value,
  } as UnaryNode);
}

/**
 * 创建 Binary 节点。需要考虑优先级。
 */
export function tokenBinaryOp(this: Parser, token: Token) {
  const binaryOp = this._grammar.binaryOps[token.value];
  this.rotatePriority(binaryOp.priority, binaryOp.rtl);
  this.placeBeforeCursor({
    type: AstNodeType.Binary,
    operator: token.value,
    left: this._cursor,
  } as BinaryNode);
}

/**
 * 创建 Member 节点。需要考虑优先级。
 * 当前 token 是 `.` 或 `.?`，如果是后者，表示是可选链。
 */
export function tokenMember(this: Parser, token: Token) {
  this.rotatePriority(MEMBER_PRIORITY);
  const node = {
    type: AstNodeType.Member,
    left: this._cursor!,
  } as MemberNode;
  if (token.type === TokenType.optionalDot) node.optional = true;
  this.leftOptional(node);
  this.placeBeforeCursor(node);
}

/**
 * 处理 Member 的属性节点，即创建 Literal 节点。形如 `a.b` 中的 `b`。
 */
export function tokenMemberProperty(this: Parser, token: Token) {
  this.placeAtCursor({ type: AstNodeType.Literal, value: token.value });
}

/**
 * 创建 Member 节点。需要考虑优先级。
 * 当前 token 是 `[` 或 `.?[`，如果是后者，表示是可选链。
 */
export function tokenComputedMember(this: Parser, token: Token) {
  this.rotatePriority(MEMBER_PRIORITY);
  const node = {
    type: AstNodeType.Member,
    computed: true,
    left: this._cursor!,
  } as MemberNode;
  if (token.type === TokenType.optionalBracket) node.optional = true;
  this.leftOptional(node);
  this.placeBeforeCursor(node);
}

/**
 * 创建 Def 节点。形如 `def a = 0` 中的 `a`。
 */
export function tokenDefName(this: Parser, token: Token) {
  this._defs.push({ name: token.value } as Def);
}

/**
 * 创建 Array 节点。当前 token 是 `[`
 */
export function tokenArrayStart(this: Parser) {
  this.placeAtCursor({ type: AstNodeType.Array, value: [] });
}

/**
 * 创建 Array 节点。当前 token 是 `{`
 */
export function tokenObjStart(this: Parser) {
  this.placeAtCursor({ type: AstNodeType.Object, entries: [] });
}

/**
 * 处理对象 key 节点。形如 `{x: 1}` 中的 `x`，或者形如 `{'x': 1}` 中的 `'x'`
 * @param token
 */
export function tokenObjKey(this: Parser, token: Token) {
  (this._cursor as ObjectNode).entries.push({
    key: {
      type: AstNodeType.Literal,
      value: token.type === TokenType.literal
        ? `${token.literal}`
        : token.value,
    },
  } as ObjectEntry);
}

/**
 * 创建 Conditional 节点。当前 token 是 `a ? b : c` 中的 `?`
 */
export function tokenTernaryStart(this: Parser) {
  this._tree = {
    type: AstNodeType.Conditional,
    test: this._tree!,
  } as ConditionalNode;
  this._cursor = this._tree;
}

/**
 * 创建 FunctionCall 节点。需要考虑优先级。
 * 当前 token 是 `a|b` 中的 `b` 或者 `a|(expression)` 中的 `(`
 */
export function tokenTransform(this: Parser, token: Token) {
  this.rotatePriority(PIPE_PRIORITY);
  const func = token.type === TokenType.identifier
    ? { type: AstNodeType.Identifier, value: token.value } as IdentifierNode
    : undefined;
  this.placeBeforeCursor({
    type: AstNodeType.FunctionCall,
    func,
    args: [this._cursor!],
  } as FunctionCallNode);
}

/**
 * 创建 FunctionCall 节点。需要考虑优先级。
 * 当前 token 是 `f()` 中的 `(`，或者 `f.?()` 中的 `.?(` 如果是后者，表示是可选链。
 */
export function tokenFunctionCall(this: Parser, token: Token) {
  this.rotatePriority(FUNCTION_CALL_PRIORITY);
  const node = {
    type: AstNodeType.FunctionCall,
    func: this._cursor!,
    args: [],
  } as FunctionCallNode;
  if (token.type === TokenType.optionalParen) node.optional = true;
  this.leftOptional(node);
  this.placeBeforeCursor(node);
}

/**
 * 处理数组元组节点，将其添加到数组列表中。
 */
export function astArrayVal(this: Parser, ast?: AstNode) {
  if (ast) (this._cursor as ArrayNode).value.push(ast);
}

/**
 * 处理对象 key 节点。形如 `{[expression]: b}` 中的 `expression`。
 */
export function astObjKey(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as ObjectNode).entries.push({ key: ast } as ObjectEntry);
}

/**
 * 处理对象 value 节点。
 */
export function astObjVal(this: Parser, ast?: AstNode) {
  this.assert(ast);
  const entries = (this._cursor as ObjectNode).entries;
  last(entries).value = ast;
}

/**
 * 处理三元表达式的 `consequent`。
 * 即 `a ? expression1 : expression2` 中的 `expression1`
 */
export function astTernaryMid(this: Parser, ast?: AstNode) {
  (this._cursor as ConditionalNode).consequent = ast;
}

/**
 * 处理三元表达式的 `alternate`。
 * 即 `a ? expression1 : expression2` 中的 `expression2`
 */
export function astTernaryEnd(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as ConditionalNode).alternate = ast;
}

/**
 * 处理变量定义。即 `def a = expression` 中的 `expression`
 */
export function astDefVal(this: Parser, ast?: AstNode) {
  this.assert(ast);
  last(this._defs).value = maybeLambda(ast);
}

/**
 * 处理管道表达式的函数。即 `a|(expression)` 中的 `expression`。
 */
export function astExprTransform(this: Parser, ast?: AstNode) {
  this.assert(ast);
  this._lambda = false;
  (this._cursor as FunctionCallNode).func = maybeLambda(ast);
}

/**
 * 处理函数参数。
 */
export function astArgVal(this: Parser, ast?: AstNode) {
  this._lambda = false;
  if (ast) (this._cursor as FunctionCallNode).args.push(maybeLambda(ast));
}

/**
 * 处理子表达式。即 `(expression)` 中的 `expression`。
 */
export function astSubExp(this: Parser, ast?: AstNode) {
  this.assert(ast);
  this.placeAtCursor(ast);
}

/**
 * 处理计算属性表达式。即 `a[expression]` 中的 `expression`
 */
export function astComputedMemberProperty(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as MemberNode).right = ast;
}
