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
 * Handles literal values, such as strings, booleans, and numerics, by adding
 * them as a new node in the AST.
 * @param token A token object
 */
export function tokenLiteral(this: Parser, token: Token) {
  this.placeAtCursor({ type: AstNodeType.Literal, value: token.literal! });
}

/**
 * Handles identifier tokens by adding them as a new node in the AST.
 * @param token A token object
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
 * Handles token of type 'unaryOp', indicating that the operation has only
 * one input: a right side.
 * @param token A token object
 */
export function tokenUnaryOp(this: Parser, token: Token) {
  this.placeAtCursor({
    type: AstNodeType.Unary,
    operator: token.value,
  } as UnaryNode);
}

/**
 * Handles tokens of type 'binaryOp', indicating an operation that has two
 * inputs: a left side and a right side.
 * @param token A token object
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

export function tokenMemberProperty(this: Parser, token: Token) {
  this.placeAtCursor({ type: AstNodeType.Literal, value: token.value });
}

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

export function tokenDefName(this: Parser, token: Token) {
  this._defs.push({ name: token.value } as Def);
}

/**
 * Handles new array literals by adding them as a new node in the AST,
 * initialized with an empty array.
 */
export function tokenArrayStart(this: Parser) {
  this.placeAtCursor({ type: AstNodeType.Array, value: [] });
}

/**
 * Handles new object literals by adding them as a new node in the AST,
 * initialized with an empty object.
 */
export function tokenObjStart(this: Parser) {
  this.placeAtCursor({ type: AstNodeType.Object, entries: [] });
}

/**
 * Queues a new object literal key to be written once a value is collected.
 * @param token A token object
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
 * Handles the start of a new ternary expression by encapsulating the entire
 * AST in a Conditional node, and using the existing tree as the
 * test element.
 */
export function tokenTernaryStart(this: Parser) {
  this._tree = {
    type: AstNodeType.Conditional,
    test: this._tree!,
  } as ConditionalNode;
  this._cursor = this._tree;
}

/**
 * Handles identifier tokens when used to indicate the name of a transform to
 * be applied, or handles open paren tokens when used to indicate the expression
 * of a function in parens to be called.
 * @param token A token object
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
 * handles open paren tokens when used to indicate the expression
 * of a function left on paren to be called.
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
 * Handles a subexpression representing an element of an array literal.
 * @param ast The subexpression tree
 */
export function astArrayVal(this: Parser, ast?: AstNode) {
  if (ast) (this._cursor as ArrayNode).value.push(ast);
}

export function astObjKey(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as ObjectNode).entries.push({ key: ast } as ObjectEntry);
}

/**
 * Handles an object value by adding its AST to the queued key on the object
 * literal node currently at the cursor.
 * @param ast The subexpression tree
 */
export function astObjVal(this: Parser, ast?: AstNode) {
  this.assert(ast);
  const entries = (this._cursor as ObjectNode).entries;
  last(entries).value = ast;
}

/**
 * Handles a completed consequent subexpression of a ternary operator.
 * @param ast The subexpression tree
 */
export function astTernaryMid(this: Parser, ast?: AstNode) {
  (this._cursor as ConditionalNode).consequent = ast;
}

/**
 * Handles a completed alternate subexpression of a ternary operator.
 * @param ast The subexpression tree
 */
export function astTernaryEnd(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as ConditionalNode).alternate = ast;
}

export function astDefVal(this: Parser, ast?: AstNode) {
  this.assert(ast);
  last(this._defs).value = maybeLambda(ast);
}

/**
 * Handles a completed subexpression of a transform to be called.
 * This can be a function in context or can be a Lambda expression.
 * @param ast The subexpression tree
 */
export function astExprTransform(this: Parser, ast?: AstNode) {
  this.assert(ast);
  this._lambda = false;
  (this._cursor as FunctionCallNode).func = maybeLambda(ast);
}

/**
 * Handles a subexpression that's used to define a transform argument's value.
 * @param ast The subexpression tree
 */
export function astArgVal(this: Parser, ast?: AstNode) {
  this._lambda = false;
  if (ast) (this._cursor as FunctionCallNode).args.push(maybeLambda(ast));
}

/**
 * Handles traditional subexpressions, delineated with the groupStart and
 * groupEnd elements.
 * @param ast The subexpression tree
 */
export function astSubExp(this: Parser, ast?: AstNode) {
  this.assert(ast);
  this.placeAtCursor(ast);
}

/**
 * Handles a subexpression used for member access an object.
 * @param ast The subexpression tree
 */
export function astComputedMemberProperty(this: Parser, ast?: AstNode) {
  this.assert(ast);
  (this._cursor as MemberNode).right = ast;
}
