import type { Parser } from './index';
import type {
  AstNode,
  LiteralNode,
  UnaryNode,
  BinaryNode,
  ArrayNode,
  ObjectNode,
  ConditionalNode,
  FunctionCallNode,
  Token,
} from '../types';
import { FUNCTION_CALL_PRIORITY, MEMBER_PRIORITY, PIPE_PRIORITY } from '../grammar';

export const handlers = {
  /**
   * Handles literal values, such as strings, booleans, and numerics, by adding
   * them as a new node in the AST.
   * @param token A token object
   */
  literal(this: Parser, token: Token) {
    this._placeAtCursor({ type: 'Literal', value: token.literal! });
  },
  /**
   * Handles identifier tokens by adding them as a new node in the AST.
   * @param token A token object
   */
  identifier(this: Parser, token: Token) {
    const identifier = token.value;
    let node: AstNode = { type: 'Identifier', value: identifier };
    if (identifier.match(/@(\d?)/)) {
      this._lambda = true;
    } else if (this._cursor && this._cursor.type === 'Binary' && this._cursor.operator === '.') {
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
      type: 'Unary',
      operator: token.value,
    } as UnaryNode);
  },
  /**
   * Handles tokens of type 'binaryOp', indicating an operation that has two
   * inputs: a left side and a right side.
   * @param token A token object
   */
  binaryOp(this: Parser, token: Token) {
    const binaryOp = this._grammar.binaryOps[token.value];
    this._priority(binaryOp.priority, binaryOp.rtl);
    this._placeBeforeCursor({
      type: 'Binary',
      operator: token.value,
      left: this._cursor,
    } as BinaryNode);
  },
  /**
   * Handles new array literals by adding them as a new node in the AST,
   * initialized with an empty array.
   */
  arrayStart(this: Parser) {
    this._placeAtCursor({ type: 'Array', value: [] });
  },
  /**
   * Handles new object literals by adding them as a new node in the AST,
   * initialized with an empty object.
   */
  objStart(this: Parser) {
    this._placeAtCursor({ type: 'Object', entries: [] });
  },
  /**
   * Queues a new object literal key to be written once a value is collected.
   * @param token A token object
   */
  objKey(this: Parser, token: Token) {
    this._curObjKey = {
      type: 'Literal',
      value: token.value,
    };
  },
  /**
   * Handles the start of a new ternary expression by encapsulating the entire
   * AST in a Conditional node, and using the existing tree as the
   * test element.
   */
  ternaryStart(this: Parser) {
    this._tree = {
      type: 'Conditional',
      test: this._tree!,
    } as ConditionalNode;
    this._cursor = this._tree;
  },
  /**
   * Handles identifier tokens when used to indicate the name of a transform to
   * be applied, or handles open paren tokens when used to indicate the expression
   * of a function in parens to be called.
   * @param token A token object
   */
  transform(this: Parser, token: Token) {
    this._priority(PIPE_PRIORITY);
    const name = token.value;
    this._placeBeforeCursor({
      type: 'FunctionCall',
      name: name === '(' ? undefined : name,
      args: [this._cursor!],
    });
  },
  /**
   * handles open paren tokens when used to indicate the expression
   * of a function left on paren to be called.
   */
  functionCall(this: Parser) {
    this._priority(FUNCTION_CALL_PRIORITY);
    this._placeBeforeCursor({
      type: 'FunctionCall',
      expr: this._cursor,
      args: [],
    });
  },
};

export const subHandlers = {
  /**
   * Handles a subexpression representing an element of an array literal.
   * @param ast The subexpression tree
   */
  arrayVal(this: Parser, ast?: AstNode) {
    if (ast) (this._cursor as ArrayNode).value.push(ast);
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
    (this._cursor as ObjectNode).entries.push({
      key: this._curObjKey!,
      value: ast,
    });
  },
  /**
   * Handles a completed consequent subexpression of a ternary operator.
   * @param ast The subexpression tree
   */
  ternaryMid(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalNode).consequent = ast;
  },
  /**
   * Handles a completed alternate subexpression of a ternary operator.
   * @param ast The subexpression tree
   */
  ternaryEnd(this: Parser, ast: AstNode) {
    (this._cursor as ConditionalNode).alternate = ast;
  },
  /**
   * Handles a completed subexpression of a transform to be called.
   * This can be a function in context or can be a Lambda expression.
   * @param ast The subexpression tree
   */
  exprTransform(this: Parser, ast: AstNode) {
    this._lambda = false;
    (this._cursor as FunctionCallNode).expr = this._maybeLambda(ast);
  },
  /**
   * Handles a subexpression that's used to define a transform argument's value.
   * @param ast The subexpression tree
   */
  argVal(this: Parser, ast?: AstNode) {
    this._lambda = false;
    if (ast) (this._cursor as FunctionCallNode).args.push(this._maybeLambda(ast));
  },
  /**
   * Handles traditional subexpressions, delineated with the groupStart and
   * groupEnd elements.
   * @param ast The subexpression tree
   */
  subExp(this: Parser, ast: AstNode) {
    this._placeAtCursor(ast);
  },
  /**
   * Handles a subexpression used for member access an object.
   * @param ast The subexpression tree
   */
  member(this: Parser, ast: AstNode) {
    this._priority(MEMBER_PRIORITY);
    this._placeBeforeCursor({
      type: 'Member',
      left: this._cursor!,
      right: ast,
    });
  },
};
