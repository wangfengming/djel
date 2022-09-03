import type { Parser } from './parser';

export interface SymbolGrammarElement {
  type:
    | 'openBracket'
    | 'closeBracket'
    | 'pipe'
    | 'openCurly'
    | 'closeCurly'
    | 'colon'
    | 'comma'
    | 'openParen'
    | 'closeParen'
    | 'question';
}

export interface BinaryOpGrammarElement {
  type: 'binaryOp';
  priority: number;
  fn: (left: any, right: any) => any;
}

export interface UnaryOpGrammarElement {
  type: 'unaryOp';
  priority: number;
  fn: (left: any) => any;
}

export interface Grammar {
  symbols: Record<string, SymbolGrammarElement>;
  unaryOp: Record<string, UnaryOpGrammarElement>;
  binaryOp: Record<string, BinaryOpGrammarElement>;
  transforms: Record<string, Function>;
}

export type TokenType =
  | 'openBracket'
  | 'closeBracket'
  | 'pipe'
  | 'openCurly'
  | 'closeCurly'
  | 'colon'
  | 'comma'
  | 'openParen'
  | 'closeParen'
  | 'question'
  | 'binaryOp'
  | 'unaryOp'
  | 'identifier'
  | 'literal';

export interface LiteralToken {
  type: 'literal';
  value: string | boolean | number;
  raw: string;
}

export interface IdentifierToken {
  type: 'identifier';
  value: string;
  raw: string;
}

export interface BinaryOpToken {
  type: 'binaryOp';
  value: string;
  raw: string;
}

export interface UnaryOpToken {
  type: 'unaryOp';
  value: string;
  raw: string;
}

export interface SymbolToken {
  type: TokenType;
  value: string;
  raw: string;
}

export type Token =
  | LiteralToken
  | IdentifierToken
  | BinaryOpToken
  | UnaryOpToken
  | SymbolToken;

export type AstNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | IndexExpressionNode
  | ArrayLiteralNode
  | ObjectLiteralNode
  | ConditionalExpressionNode
  | FunctionCallNode
  | LambdaNode;

interface AstNodeBase {
  type: AstNodeType;
  _parent?: AstNode;
  _lambda?: boolean;
}

export type AstNodeType =
  | 'Literal'
  | 'Identifier'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'IndexExpression'
  | 'ObjectLiteral'
  | 'ArrayLiteral'
  | 'ConditionalExpression'
  | 'FunctionCall'
  | 'Lambda'

export interface LiteralNode extends AstNodeBase {
  type: 'Literal';
  value: string | number | boolean;
}

export interface IdentifierNode extends AstNodeBase {
  type: 'Identifier';
  value: string;
  argIndex?: number;
}

export interface BinaryExpressionNode extends AstNodeBase {
  type: 'BinaryExpression';
  operator: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryExpressionNode extends AstNodeBase {
  type: 'UnaryExpression';
  operator: string;
  right: AstNode;
}

export interface IndexExpressionNode extends AstNodeBase {
  type: 'IndexExpression';
  left: AstNode;
  right: AstNode;
}

export interface ObjectLiteralNode extends AstNodeBase {
  type: 'ObjectLiteral';
  value: Record<string, AstNode>;
}

export interface ArrayLiteralNode extends AstNodeBase {
  type: 'ArrayLiteral';
  value: AstNode[];
}

export interface ConditionalExpressionNode extends AstNodeBase {
  type: 'ConditionalExpression';
  test: AstNode;
  consequent: AstNode;
  alternate: AstNode;
}

export interface FunctionCallNode extends AstNodeBase {
  type: 'FunctionCall';
  name?: string;
  expr?: AstNode;
  args: AstNode[];
}

export interface LambdaNode extends AstNodeBase {
  type: 'Lambda';
  expr: AstNode;
}

export type StateType =
  | 'expectOperand'
  | 'expectBinOp'
  | 'expectObjKey'
  | 'expectKeyValSep'
  | 'identifier'
  | 'index'
  | 'expectTransform'
  | 'postTransform'
  | 'lambdaTransform'
  | 'postTransformArgs'
  | 'subExpression'
  | 'argVal'
  | 'objVal'
  | 'arrayVal'
  | 'ternaryMid'
  | 'ternaryEnd'
  | 'complete';

export interface State {
  tokenTypes?: Partial<Record<TokenType, StateTypeOpts>>;
  completable?: boolean;
  subHandler?: (this: Parser, ast: AstNode) => void;
  endStates?: Partial<Record<TokenType, StateType>>;
}

export interface StateTypeOpts {
  toState?: StateType;
  handler?: (this: Parser, token: Token) => void;
}
