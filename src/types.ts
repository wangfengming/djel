import type { Parser } from './parser';

export interface SymbolGrammar {
  type: TokenType;
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
  transforms: Record<string, (...args: []) => any>;
}

export interface Token {
  type: TokenType;
  value: string;
  raw: string;
  // for literal token.
  literal?: string | number | boolean | null;
  // for arguments identifier
  argIndex?: number;
}

export const enum TokenType {
  openBracket = 1,
  optionalBracket,
  closeBracket,
  openCurly,
  closeCurly,
  openParen,
  optionalParen,
  closeParen,
  dot,
  optionalDot,
  colon,
  comma,
  question,
  pipe,
  def,
  assign,
  semi,
  binaryOp,
  unaryOp,
  identifier,
  literal,
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
  | LambdaNode
  | DefNode;

interface AstNodeBase {
  type: AstNodeType;
  _parent?: AstNode;
  _lambda?: boolean;
}

export const enum AstNodeType {
  Literal = 1,
  Identifier,
  Binary,
  Unary,
  Member,
  Object,
  Array,
  Conditional,
  FunctionCall,
  Lambda,
  Def,
}

export interface LiteralNode extends AstNodeBase {
  type: AstNodeType.Literal;
  value: string | number | boolean;
}

export interface IdentifierNode extends AstNodeBase {
  type: AstNodeType.Identifier;
  value: string;
  argIndex?: number;
}

export interface BinaryNode extends AstNodeBase {
  type: AstNodeType.Binary;
  operator: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryNode extends AstNodeBase {
  type: AstNodeType.Unary;
  operator: string;
  right: AstNode;
}

export interface OptionalBase {
  optional?: boolean;
  leftOptional?: boolean;
}

export interface MemberNode extends AstNodeBase, OptionalBase {
  type: AstNodeType.Member;
  computed?: boolean;
  left: AstNode;
  right: AstNode;
}

export interface ObjectNode extends AstNodeBase {
  type: AstNodeType.Object;
  entries: ObjectEntry[];
}

export interface ObjectEntry {
  key: AstNode;
  value: AstNode;
}

export interface ArrayNode extends AstNodeBase {
  type: AstNodeType.Array;
  value: AstNode[];
}

export interface ConditionalNode extends AstNodeBase {
  type: AstNodeType.Conditional;
  test: AstNode;
  consequent?: AstNode;
  alternate: AstNode;
}

export interface FunctionCallNode extends AstNodeBase, OptionalBase {
  type: AstNodeType.FunctionCall;
  func: AstNode;
  args: AstNode[];
}

export interface LambdaNode extends AstNodeBase {
  type: AstNodeType.Lambda;
  expr: AstNode;
}

export interface DefNode extends AstNodeBase {
  type: AstNodeType.Def,
  defs: Def[];
  statement: AstNode;
}

export interface Def {
  name: string;
  value: AstNode;
}

export const enum StateType {
  expectOperand = 1,
  expectBinOp,
  expectObjKey,
  expectKeyValSep,
  computedMember,
  member,
  def,
  defAssign,
  defVal,
  expectTransform,
  postTransform,
  exprTransform,
  subExp,
  argVal,
  objKey,
  objVal,
  arrayVal,
  ternaryMid,
  ternaryEnd,
  complete,
}

export interface State {
  tokens?: Partial<Record<TokenType, StateTypeOpts>>;
  completable?: boolean;
  subHandler?: (this: Parser, ast?: AstNode) => void;
  endTokens?: Partial<Record<TokenType, StateType>>;
}

export interface StateTypeOpts {
  toState?: StateType;
  handler?: (this: Parser, token: Token) => void;
}

export interface EvaluateContext {
  grammar: Grammar;
  variables?: any;
  locals?: Record<string, any>;
  args?: any[];
  leftNull?: boolean;
}
