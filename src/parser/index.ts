import type {
  AstNode,
  BinaryNode,
  Def,
  Grammar,
  MemberNode,
  OptionalBase,
  Token,
  TokenType,
  UnaryNode,
} from '../types';
import { AstNodeType, StateType } from '../types';
import { MEMBER_PRIORITY } from '../grammar';
import { set } from '../utils';
import { states } from './states';

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
  _endTokens: Partial<Record<TokenType, StateType>>;

  _stateType: StateType;
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
   * @param [endTokens] mapping of token types to any truthy value. When the token type is encountered,
   * the parser will return the mapped value instead of boolean false.
   * @constructor
   */
  constructor(
    grammar: Omit<Grammar, 'transforms'>,
    prefix?: string,
    endTokens?: Record<string, StateType>,
  ) {
    this._grammar = grammar;
    this._exprStr = prefix || '';
    this._endTokens = endTokens || {};
    this._stateType = StateType.expectOperand;
  }

  private get _state() {
    return states[this._stateType];
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
  private addToken(token: Token): StateType | undefined {
    if (this._stateType == StateType.complete) {
      throw new Error('Cannot add a new token to a completed Parser');
    }
    const startExpr = this._exprStr;
    this._token = token;
    this._exprStr += token.raw;
    const { tokens, subHandler } = this._state;
    if (subHandler) {
      if (!this._subParser) this._startSubExp(startExpr);
      const stopState = this._subParser!.addToken(token);
      if (stopState != null) {
        this._endSubExp();
        if (this._parentStop) return stopState;
        this._stateType = stopState;
      }
    } else if (tokens && tokens[token.type]) {
      const { handler, toState } = tokens[token.type]!;
      if (handler) handler.call(this, token);
      if (toState != null) this._stateType = toState;
    } else if (this._endTokens[token.type]) {
      return this._endTokens[token.type];
    } else {
      this.assert(false);
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
    if (this._cursor && !this._state.completable) {
      throw new Error(`Unexpected end of expression: ${this._exprStr}`);
    }
    if (this._subParser) this._endSubExp();
    this._stateType = StateType.complete;
    if (this._lambda && this._tree) {
      set(this._tree, '_lambda', true);
    }
    return this._tree && this._defs.length
      ? { type: AstNodeType.Def, defs: this._defs, statement: this._tree }
      : this._tree;
  }

  /**
   * Places a new tree node at the current position of the cursor (to the 'right'
   * property) and then advances the cursor to the new node. This function also
   * handles setting the parent of the new node.
   * @param node A node to be added to the AST
   */
  placeAtCursor(node: AstNode) {
    if (!this._cursor) {
      this._tree = node;
    } else {
      (this._cursor as BinaryNode | UnaryNode | MemberNode).right = node;
      set(node, '_parent', this._cursor);
    }
    this._cursor = node;
  }

  /**
   * Places a tree node before the current position of the cursor, replacing
   * the node that the cursor currently points to. This should only be called in
   * cases where the cursor is known to exist, and the provided node already
   * contains a pointer to what's at the cursor currently.
   * @param node A node to be added to the AST
   */
  placeBeforeCursor(node: AstNode) {
    this._cursor = this._cursor!._parent;
    this.placeAtCursor(node);
  }

  /**
   * Prepares the Parser to accept a subexpression by (re)instantiating the
   * subParser.
   * @param {string} [exprStr] The expression string to prefix to the new Parser
   */
  private _startSubExp(exprStr: string) {
    let endTokens = this._state.endTokens;
    if (!endTokens) {
      this._parentStop = true;
      endTokens = this._endTokens;
    }
    this._subParser = new Parser(this._grammar, exprStr, endTokens);
  }

  /**
   * Ends a subexpression by completing the subParser and passing its result
   * to the subHandler configured in the current state.
   */
  private _endSubExp() {
    const ast = this._subParser!.complete();
    if (ast && ast._lambda) this._lambda = true;
    this._state.subHandler!.call(this, ast);
    this._subParser = undefined;
  }

  /**
   * Rotate the tree to the correct priority
   * @param {number} priority target priority
   * @param {boolean} [rtl] the new operator associativity
   */
  rotatePriority(priority: number, rtl?: boolean) {
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
  private _getPriority(ast: AstNode) {
    const { binaryOps, unaryOps } = this._grammar;
    if (ast.type === AstNodeType.Binary) {
      return binaryOps[ast.operator].priority;
    }
    if (ast.type === AstNodeType.Unary) {
      return unaryOps[ast.operator].priority;
    }
    if (ast.type === AstNodeType.Member) {
      return MEMBER_PRIORITY;
    }
    /* istanbul ignore next */
    return 0;
  }

  leftOptional(ast: OptionalBase) {
    const left = this._cursor as OptionalBase;
    if (left.optional || left.leftOptional) ast.leftOptional = true;
  }

  assert(condition: unknown): asserts condition {
    if (!condition) {
      throw new Error(
        `Token ${this._token?.raw} unexpected in expression: ${this._exprStr}`,
      );
    }
  }
}
