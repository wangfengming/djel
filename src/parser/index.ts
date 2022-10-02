import type {
  AstNode,
  BinaryNode,
  UnaryNode,
  MemberNode,
  LambdaNode,
  OptionalBase,
  Def,
  Token,
  TokenType,
  StateType,
  Grammar,
} from '../types';
import { states } from './states';
import { MEMBER_PRIORITY } from '../grammar';

/**
 * The Parser is a state machine that converts tokens into
 * an Abstract Syntax Tree (AST), capable of being evaluated in any
 * context by the Evaluator. The Parser expects that all tokens
 * provided to it are legal and typed properly according to the grammar, but
 * accepts that the tokens may still be in an invalid order
 * that requires it to throw an Error.
 */
export class Parser {
  _grammar: Omit<Grammar, 'transforms'>;
  _exprStr: string;
  _stopMap: Partial<Record<TokenType, StateType>>;

  _state: StateType;
  _token?: Token;
  _tree?: AstNode;
  _cursor?: AstNode;
  _subParser?: Parser;
  _parentStop?: boolean;
  _lambda?: boolean;
  _defs: Def[] = [];

  /**
   * @param grammar
   * @param {string} [prefix] string prefix to prepend to the expression string for error messaging purposes.
   * This is useful for when a new Parser is instantiated to parse a subexpression,
   * as the parent Parser's expression string thus far can be passed for a more
   * user-friendly error message.
   * @param [stopMap] mapping of token types to any truthy value. When the token type is encountered,
   * the parser will return the mapped value instead of boolean false.
   * @constructor
   */
  constructor(
    grammar: Omit<Grammar, 'transforms'>,
    prefix?: string,
    stopMap?: Record<string, StateType>,
  ) {
    this._grammar = grammar;
    this._exprStr = prefix || '';
    this._stopMap = stopMap || {};
    this._state = 'expectOperand';
  }

  /**
   * Processes a new token into the AST and manages the transitions of the state
   * machine.
   * @param token A token object, as provided by the tokenize function.
   * @throws {Error} if a token is added when the Parser has been marked as
   *      complete by complete, or if an unexpected token type is added.
   * @returns the stopState value if this parser encountered a token
   *      in the stopState map; false if tokens can continue.
   */
  addToken(token: Token): StateType | undefined {
    if (this._state == 'complete') {
      throw new Error('Cannot add a new token to a completed Parser');
    }
    const state = states[this._state];
    const startExpr = this._exprStr;
    this._token = token;
    this._exprStr += token.raw;
    if (state.subHandler) {
      if (!this._subParser) this._startSubExp(startExpr);
      const stopState = this._subParser!.addToken(token);
      if (stopState) {
        this._endSubExp();
        if (this._parentStop) return stopState;
        this._state = stopState;
      }
    } else if (state.tokenTypes && state.tokenTypes[token.type]) {
      const tokenType = state.tokenTypes[token.type]!;
      if (tokenType.handler) tokenType.handler.call(this, token);
      if (tokenType.toState) this._state = tokenType.toState;
    } else if (this._stopMap[token.type]) {
      return this._stopMap[token.type];
    } else {
      this._assert(false);
    }
  }

  /**
   * Processes an array of tokens iteratively through the addToken function.
   * @param tokens An array of tokens, as provided by the tokenize function.
   */
  addTokens(tokens: Token[]) {
    tokens.forEach(this.addToken, this);
  }

  /**
   * Marks this Parser instance as completed and retrieves the full AST.
   * @returns a full expression tree, ready for evaluation by the Evaluator,
   * or null if no tokens were passed to the parser before complete was called
   * @throws {Error} if the parser is not in a state where it's legal to end
   *      the expression, indicating that the expression is incomplete
   */
  complete(): AstNode | undefined {
    if (this._cursor && !states[this._state].completable) {
      throw new Error(`Unexpected end of expression: ${this._exprStr}`);
    }
    if (this._subParser) this._endSubExp();
    this._state = 'complete';
    if (this._lambda) {
      Object.defineProperty(this._tree, '_lambda', { value: true, writable: true });
    }
    return this._tree && this._defs.length
      ? { type: 'Def', defs: this._defs, statement: this._tree }
      : this._tree;
  }

  /**
   * Places a new tree node at the current position of the cursor (to the 'right'
   * property) and then advances the cursor to the new node. This function also
   * handles setting the parent of the new node.
   * @param node A node to be added to the AST
   */
  _placeAtCursor(node: AstNode) {
    if (!this._cursor) {
      this._tree = node;
    } else {
      (this._cursor as BinaryNode | UnaryNode | MemberNode).right = node;
      this._setParent(node, this._cursor);
    }
    this._cursor = node;
  }

  /**
   * Sets the parent of a node by creating a non-enumerable _parent property
   * that points to the supplied parent argument.
   * @param node A node of the AST on which to set a new
   *      parent
   * @param [parent] An existing node of the AST to serve as the
   *      parent of the new node
   */
  _setParent(node: AstNode, parent?: AstNode) {
    Object.defineProperty(node, '_parent', { value: parent, writable: true });
  }

  /**
   * Places a tree node before the current position of the cursor, replacing
   * the node that the cursor currently points to. This should only be called in
   * cases where the cursor is known to exist, and the provided node already
   * contains a pointer to what's at the cursor currently.
   * @param node A node to be added to the AST
   */
  _placeBeforeCursor(node: AstNode) {
    this._cursor = this._cursor!._parent;
    this._placeAtCursor(node);
  }

  /**
   * Prepares the Parser to accept a subexpression by (re)instantiating the
   * subParser.
   * @param {string} [exprStr] The expression string to prefix to the new Parser
   */
  _startSubExp(exprStr: string) {
    let endStates = states[this._state].endStates;
    if (!endStates) {
      this._parentStop = true;
      endStates = this._stopMap;
    }
    this._subParser = new Parser(this._grammar, exprStr, endStates);
  }

  /**
   * Ends a subexpression by completing the subParser and passing its result
   * to the subHandler configured in the current state.
   */
  _endSubExp() {
    const ast = this._subParser!.complete();
    if (ast && ast._lambda) this._lambda = true;
    states[this._state].subHandler!.call(this, ast);
    this._subParser = undefined;
  }

  /**
   * Rotate the tree to the correct priority
   * @param {number} priority target priority
   * @param {boolean} [rtl] the new operator associativity
   */
  _rotatePriority(priority: number, rtl?: boolean) {
    let parent = this._cursor && this._cursor._parent;
    while (parent) {
      const parentPriority = this._getPriority(parent);
      if (rtl ? (parentPriority <= priority) : (parentPriority < priority)) break;
      this._cursor = parent;
      parent = parent._parent;
    }
  }

  /**
   * Get the priority of a Binary or Unary
   */
  _getPriority(ast: AstNode) {
    if (ast.type === 'Binary') {
      return this._grammar.binaryOps[ast.operator].priority;
    }
    if (ast.type === 'Unary') {
      return this._grammar.unaryOps[ast.operator].priority;
    }
    if (ast.type === 'Member') {
      return MEMBER_PRIORITY;
    }
    /* istanbul ignore next */
    return 0;
  }

  /**
   * Convert an AstNode to a Lambda node if it can be a Lambda (contain symbol `@`).
   * @param ast the input AstNode
   * @return ast Return a new Lambda node if the AstNode can be a Lambda,
   * otherwise return the original node.
   */
  _maybeLambda(ast: AstNode) {
    return ast._lambda ? { type: 'Lambda', expr: ast } as LambdaNode : ast;
  }

  _leftOptional(ast: OptionalBase) {
    const left = this._cursor as OptionalBase;
    if (left.optional || left.leftOptional) ast.leftOptional = true;
  }

  _assert(condition: unknown): asserts condition {
    if (!condition) {
      throw new Error(
        `Token ${this._token?.raw} unexpected in expression: ${this._exprStr}`,
      );
    }
  }
}
