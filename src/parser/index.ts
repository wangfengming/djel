import type {
  AstNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  IndexExpressionNode,
  LambdaNode,
  Token,
  TokenType,
  StateType,
  Grammar,
} from '../types';
import type { TokenHandlersKey } from './handlers';
import { states } from './states';
import { tokenHandlers } from './handlers';

export class Parser {
  _grammar: Omit<Grammar, 'transforms'>;
  _exprStr: string;
  _stopMap: Partial<Record<TokenType, StateType>>;

  _state: StateType;
  _tree?: AstNode;
  _cursor?: AstNode;
  _subParser?: Parser;
  _curObjKey?: string;
  _parentStop?: boolean;
  _lambda?: boolean;

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

  addToken(token: Token): StateType | undefined {
    if (this._state == 'complete') {
      throw new Error('Cannot add a new token to a completed Parser');
    }
    const state = states[this._state];
    const startExpr = this._exprStr;
    this._exprStr += token.raw;
    if (state.subHandler) {
      if (!this._subParser) this._startSubExpression(startExpr);
      const stopState = this._subParser!.addToken(token);
      if (stopState) {
        this._endSubExpression();
        if (this._parentStop) return stopState;
        this._state = stopState;
      }
    } else if (state.tokenTypes && state.tokenTypes[token.type]) {
      const tokenType = state.tokenTypes[token.type]!;
      if (tokenType.handler) {
        tokenType.handler.call(this, token);
      } else if (tokenHandlers[token.type as TokenHandlersKey]) {
        tokenHandlers[token.type as TokenHandlersKey].call(this, token);
      }
      if (tokenType.toState) this._state = tokenType.toState;
    } else if (this._stopMap[token.type]) {
      return this._stopMap[token.type];
    } else {
      throw new Error(
        `Token ${token.raw} unexpected in expression: ${this._exprStr}`,
      );
    }
  }

  addTokens(tokens: Token[]) {
    tokens.forEach(this.addToken, this);
  }

  complete() {
    if (this._cursor && !states[this._state].completable) {
      throw new Error(`Unexpected end of expression: ${this._exprStr}`);
    }
    if (this._subParser) this._endSubExpression();
    this._state = 'complete';
    if (this._lambda) {
      Object.defineProperty(this._tree, '_lambda', { value: true, writable: true });
    }
    return this._tree!;
  }

  _placeAtCursor(node: AstNode) {
    if (!this._cursor) {
      this._tree = node;
    } else {
      (this._cursor as BinaryExpressionNode | UnaryExpressionNode | IndexExpressionNode).right = node;
      this._setParent(node, this._cursor);
    }
    this._cursor = node;
  }

  _setParent(node: AstNode, parent?: AstNode) {
    Object.defineProperty(node, '_parent', { value: parent, writable: true });
  }

  _placeBeforeCursor(node: AstNode) {
    this._cursor = this._cursor!._parent;
    this._placeAtCursor(node);
  }

  _startSubExpression(exprStr: string) {
    let endStates = states[this._state].endStates;
    if (!endStates) {
      this._parentStop = true;
      endStates = this._stopMap;
    }
    this._subParser = new Parser(this._grammar, exprStr, endStates);
  }

  _endSubExpression() {
    const ast = this._subParser!.complete();
    if (ast && ast._lambda) this._lambda = true;
    states[this._state].subHandler!.call(this, ast);
    this._subParser = undefined;
  }

  _priority(priority: number) {
    let parent = this._cursor && this._cursor._parent;
    while (parent && this._getPriority(parent) >= priority) {
      this._cursor = parent;
      parent = parent._parent;
    }
    return parent;
  }

  _getPriority(ast: AstNode) {
    if (ast.type === 'BinaryExpression') {
      return this._grammar.binaryOps[ast.operator].priority || -1;
    }
    if (ast.type === 'UnaryExpression') {
      return this._grammar.unaryOps[ast.operator].priority || -1;
    }
    return -1;
  }

  _maybeLambda(ast: AstNode) {
    return ast._lambda ? { type: 'Lambda', expr: ast } as LambdaNode : ast;
  }
}
