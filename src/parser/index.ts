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

  addTokens(tokens: Token[]) {
    tokens.forEach(this.addToken, this);
  }

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

  placeAtCursor(node: AstNode) {
    if (!this._cursor) {
      this._tree = node;
    } else {
      (this._cursor as BinaryNode | UnaryNode | MemberNode).right = node;
      set(node, '_parent', this._cursor);
    }
    this._cursor = node;
  }

  placeBeforeCursor(node: AstNode) {
    this._cursor = this._cursor!._parent;
    this.placeAtCursor(node);
  }

  private _startSubExp(exprStr: string) {
    let endTokens = this._state.endTokens;
    if (!endTokens) {
      this._parentStop = true;
      endTokens = this._endTokens;
    }
    this._subParser = new Parser(this._grammar, exprStr, endTokens);
  }

  private _endSubExp() {
    const ast = this._subParser!.complete();
    if (ast && ast._lambda) this._lambda = true;
    this._state.subHandler!.call(this, ast);
    this._subParser = undefined;
  }

  rotatePriority(priority: number, rtl?: boolean) {
    let parent = this._cursor && this._cursor._parent;
    while (parent) {
      const parentPriority = this._getPriority(parent);
      if (rtl ? (parentPriority <= priority) : (parentPriority < priority)) break;
      this._cursor = parent;
      parent = parent._parent;
    }
  }

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
