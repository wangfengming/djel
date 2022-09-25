import type { Parser } from './parser';

export interface SymbolGrammar {
  type:
    | 'openBracket'
    | 'closeBracket'
    | 'openCurly'
    | 'closeCurly'
    | 'openParen'
    | 'closeParen'
    | 'colon'
    | 'comma'
    | 'question'
    | 'pipe';
}

export interface BinaryOpGrammar {
  priority: number;
  rtl?: boolean;
  delay?: false;
  fn: (left: any, right: any) => any;
}

export interface DelayBinaryOpGrammar {
  priority: number;
  rtl?: boolean;
  delay: true;
  fn: (left: any, right: () => any) => any;
}

export interface UnaryOpGrammar {
  priority: number;
  fn: (left: any) => any;
}

export interface Grammar {
  symbols: Record<string, SymbolGrammar>;
  unaryOps: Record<string, UnaryOpGrammar>;
  binaryOps: Record<string, BinaryOpGrammar | DelayBinaryOpGrammar>;
  transforms: Record<string, Function>;
}

export type TokenType =
  | 'openBracket'
  | 'closeBracket'
  | 'openCurly'
  | 'closeCurly'
  | 'openParen'
  | 'closeParen'
  | 'colon'
  | 'comma'
  | 'question'
  | 'pipe'
  | 'binaryOp'
  | 'unaryOp'
  | 'identifier'
  | 'literal';

export interface Token {
  type: TokenType;
  value: string;
  raw: string;
  // for literal token.
  literal?: string | number | boolean;
}

export type AstNode =
  | LiteralNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | MemberNode
  | ArrayNode
  | ObjectNode
  | ConditionalNode
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
  | 'Binary'
  | 'Unary'
  | 'Member'
  | 'Object'
  | 'Array'
  | 'Conditional'
  | 'FunctionCall'
  | 'Lambda'

export interface LiteralNode extends AstNodeBase {
  type: 'Literal';
  value: string | number | boolean;
}

export interface IdentifierNode extends AstNodeBase {
  type: 'Identifier';
  value: string;
}

export interface BinaryNode extends AstNodeBase {
  type: 'Binary';
  operator: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryNode extends AstNodeBase {
  type: 'Unary';
  operator: string;
  right: AstNode;
}

export interface MemberNode extends AstNodeBase {
  type: 'Member';
  left: AstNode;
  right: AstNode;
}

export interface ObjectNode extends AstNodeBase {
  type: 'Object';
  entries: { key: AstNode; value: AstNode }[];
}

export interface ArrayNode extends AstNodeBase {
  type: 'Array';
  value: AstNode[];
}

export interface ConditionalNode extends AstNodeBase {
  type: 'Conditional';
  test: AstNode;
  consequent?: AstNode;
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
  | 'member'
  | 'expectTransform'
  | 'postTransform'
  | 'exprTransform'
  | 'subExp'
  | 'argVal'
  | 'objKey'
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
