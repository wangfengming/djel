import type { Parser } from './index';
import type {
  AstNode,
  LiteralNode,
  IdentifierNode,
  UnaryExpressionNode,
  BinaryExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  ConditionalExpressionNode,
  FunctionCallNode,
  BinaryOpGrammarElement,
  Token,
  LiteralToken,
  IdentifierToken,
  UnaryOpToken,
  BinaryOpToken,
} from '../types';

export const handlers = {
  arrayStart(this: Parser) {
    this._placeAtCursor({ type: 'ArrayLiteral', value: [] });
  },
  objStart(this: Parser) {
    this._placeAtCursor({ type: 'ObjectLiteral', value: {} });
  },
  objKey(this: Parser, token: Token) {
    this._curObjKey = (token as IdentifierToken).value;
  },
  ternaryStart(this: Parser) {
    this._tree = {
      type: 'ConditionalExpression',
      test: this._tree!,
    } as ConditionalExpressionNode;
    this._cursor = this._tree;
  },
  transform(this: Parser, token: Token) {
    this._priority(100);
    const name = (token as IdentifierToken).value;
    this._placeBeforeCursor({
      type: 'FunctionCall',
      name: name === '(' ? undefined : name,
      args: [this._cursor!],
    });
  },
};

export const subHandlers = {
  arrayVal(this: Parser, ast?: AstNode) {
    if (ast) (this._cursor as ArrayLiteralNode)?.value.push(ast);
  },
  objVal(this: Parser, ast: AstNode) {
    (this._cursor as ObjectLiteralNode).value[this._curObjKey!] = ast;
  },
  ternaryMid(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalExpressionNode).consequent = ast;
  },
  ternaryEnd(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalExpressionNode).alternate = ast;
  },
  lambdaTransform(this: Parser, ast: AstNode) {
    (this._cursor as FunctionCallNode).expr = this._maybeLambda(ast);
  },
  argVal(this: Parser, ast: AstNode) {
    (this._cursor as FunctionCallNode)?.args.push(this._maybeLambda(ast));
  },
  subExpression(this: Parser, ast: AstNode) {
    this._placeAtCursor(ast);
  },
  index(this: Parser, ast: AstNode) {
    this._priority(10000);
    this._placeBeforeCursor({
      type: 'IndexExpression',
      left: this._cursor!,
      right: ast,
    });
  },
};

export type TokenHandlersKey = keyof typeof tokenHandlers;

export const tokenHandlers = {
  literal(this: Parser, token: Token) {
    this._placeAtCursor({ type: 'Literal', value: (token as LiteralToken).value });
  },
  identifier(this: Parser, token: Token) {
    const identifier = (token as IdentifierToken).value;
    const argMatch = identifier.match(/@(\d?)/);
    let node: AstNode = { type: 'Identifier', value: identifier };
    if (argMatch) {
      (node as IdentifierNode).argIndex = +argMatch[1];
      this._lambda = true;
    } else if (this._cursor?.type === 'BinaryExpression' && this._cursor.operator === '.') {
      node = { type: 'Literal', value: identifier } as LiteralNode;
    }
    this._placeAtCursor(node);
  },
  unaryOp(this: Parser, token: Token) {
    this._placeAtCursor({
      type: 'UnaryExpression',
      operator: (token as UnaryOpToken).value,
    } as UnaryExpressionNode);
  },
  binaryOp(this: Parser, token: Token) {
    const priority = (this._grammarElements[(token as BinaryOpToken).value] as BinaryOpGrammarElement).priority || 0;
    const parent = this._priority(priority);
    const node = {
      type: 'BinaryExpression',
      operator: token.value,
      left: this._cursor,
    } as BinaryExpressionNode;
    this._setParent(this._cursor!, node);
    this._cursor = parent;
    this._placeAtCursor(node);
  },
};
