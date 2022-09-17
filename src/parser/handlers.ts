import type { Parser } from './index';
import type {
  AstNode,
  LiteralNode,
  UnaryExpressionNode,
  BinaryExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  ConditionalExpressionNode,
  FunctionCallNode,
  Token,
  LiteralToken,
  IdentifierToken,
  UnaryOpToken,
  BinaryOpToken,
} from '../types';
import { INDEX_PRIORITY, PIPE_PRIORITY } from '../grammar';

export const handlers = {
  /**
   * Handles literal values, such as strings, booleans, and numerics, by adding
   * them as a new node in the AST.
   * @param token A token object
   */
  literal(this: Parser, token: Token) {
    this._placeAtCursor({ type: 'Literal', value: (token as LiteralToken).value });
  },
  /**
   * Handles identifier tokens by adding them as a new node in the AST.
   * @param token A token object
   */
  identifier(this: Parser, token: Token) {
    const identifier = (token as IdentifierToken).value;
    let node: AstNode = { type: 'Identifier', value: identifier };
    if (identifier.match(/@(\d?)/)) {
      this._lambda = true;
    } else if (this._cursor && this._cursor.type === 'BinaryExpression' && this._cursor.operator === '.') {
      node = { type: 'Literal', value: identifier } as LiteralNode;
    }
    this._placeAtCursor(node);
  },
  /**
   * Handles token of type 'unaryOp', indicating that the operation has only
   * one input: a right side.
   * @param token A token object
   */
  unaryOp(this: Parser, token: Token) {
    this._placeAtCursor({
      type: 'UnaryExpression',
      operator: (token as UnaryOpToken).value,
    } as UnaryExpressionNode);
  },
  /**
   * Handles tokens of type 'binaryOp', indicating an operation that has two
   * inputs: a left side and a right side.
   * @param token A token object
   */
  binaryOp(this: Parser, token: Token) {
    const priority = this._grammar.binaryOps[(token as BinaryOpToken).value].priority || 0;
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
  /**
   * Handles new array literals by adding them as a new node in the AST,
   * initialized with an empty array.
   */
  arrayStart(this: Parser) {
    this._placeAtCursor({ type: 'ArrayLiteral', value: [] });
  },
  /**
   * Handles new object literals by adding them as a new node in the AST,
   * initialized with an empty object.
   */
  objStart(this: Parser) {
    this._placeAtCursor({ type: 'ObjectLiteral', entries: [] });
  },
  /**
   * Queues a new object literal key to be written once a value is collected.
   * @param token A token object
   */
  objKey(this: Parser, token: Token) {
    this._curObjKey = {
      type: 'Literal',
      value: (token as IdentifierToken).value,
    };
  },
  /**
   * Handles the start of a new ternary expression by encapsulating the entire
   * AST in a ConditionalExpression node, and using the existing tree as the
   * test element.
   */
  ternaryStart(this: Parser) {
    this._tree = {
      type: 'ConditionalExpression',
      test: this._tree!,
    } as ConditionalExpressionNode;
    this._cursor = this._tree;
  },
  /**
   * Handles identifier tokens when used to indicate the name of a transform to
   * be applied.
   * @param token A token object
   */
  transform(this: Parser, token: Token) {
    this._priority(PIPE_PRIORITY);
    const name = (token as IdentifierToken).value;
    this._placeBeforeCursor({
      type: 'FunctionCall',
      name: name === '(' ? undefined : name,
      args: [this._cursor!],
    });
  },
};

export const subHandlers = {
  /**
   * Handles a subexpression representing an element of an array literal.
   * @param ast The subexpression tree
   */
  arrayVal(this: Parser, ast?: AstNode) {
    if (ast) (this._cursor as ArrayLiteralNode).value.push(ast);
  },
  objKey(this: Parser, ast: AstNode) {
    this._curObjKey = ast;
  },
  /**
   * Handles an object value by adding its AST to the queued key on the object
   * literal node currently at the cursor.
   * @param ast The subexpression tree
   */
  objVal(this: Parser, ast: AstNode) {
    (this._cursor as ObjectLiteralNode).entries.push({
      key: this._curObjKey!,
      value: ast,
    });
  },
  /**
   * Handles a completed consequent subexpression of a ternary operator.
   * @param ast The subexpression tree
   */
  ternaryMid(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalExpressionNode).consequent = ast;
  },
  /**
   * Handles a completed alternate subexpression of a ternary operator.
   * @param ast The subexpression tree
   */
  ternaryEnd(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalExpressionNode).alternate = ast;
  },
  /**
   * Handles a completed subexpression of a transform to be called.
   * This can be a function in context or can be a Lambda expression.
   * @param ast The subexpression tree
   */
  exprTransform(this: Parser, ast: AstNode) {
    (this._cursor as FunctionCallNode).expr = this._maybeLambda(ast);
  },
  /**
   * Handles a subexpression that's used to define a transform argument's value.
   * @param ast The subexpression tree
   */
  argVal(this: Parser, ast: AstNode) {
    (this._cursor as FunctionCallNode).args.push(this._maybeLambda(ast));
  },
  /**
   * Handles traditional subexpressions, delineated with the groupStart and
   * groupEnd elements.
   * @param ast The subexpression tree
   */
  subExpression(this: Parser, ast: AstNode) {
    this._placeAtCursor(ast);
  },
  /**
   * Handles a subexpression used for index an array returned by an
   * identifier chain.
   * @param ast The subexpression tree
   */
  index(this: Parser, ast: AstNode) {
    this._priority(INDEX_PRIORITY);
    this._placeBeforeCursor({
      type: 'IndexExpression',
      left: this._cursor!,
      right: ast,
    });
  },
};
