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
  isArg?: boolean;
  argIdx?: number;
}

export const enum TokenType {
  // [
  openBracket = 1,
  // ?.[
  optionalBracket = 2,
  // ]
  closeBracket = 3,
  // {
  openCurly = 4,
  // }
  closeCurly = 5,
  // (
  openParen = 6,
  // ?.(
  optionalParen = 7,
  // )
  closeParen = 8,
  // .
  dot = 9,
  // ?.
  optionalDot = 10,
  // :
  colon = 11,
  // ,
  comma = 12,
  // ?
  question = 13,
  // |
  pipe = 14,
  // def
  def = 15,
  // =
  assign = 16,
  // ;
  semi = 17,
  binaryOp = 18,
  unaryOp = 19,
  identifier = 20,
  literal = 21,
  // fn
  fn = 22,
  // =>
  arrow = 23,
  // ...
  spread = 24,
}

export type AstNode =
  | LiteralNode
  | IdentifierNode
  | UnaryNode
  | BinaryNode
  | MemberNode
  | ArrayNode
  | ObjectNode
  | SpreadNode
  | ConditionalNode
  | FunctionCallNode
  | FunctionNode
  | DefNode;

interface AstNodeBase {
  type: AstNodeType;
  _parent?: AstNode;
  _lambda?: boolean;
}

export const enum AstNodeType {
  Literal = 'literal',
  Identifier = 'id',
  Binary = 'bin',
  Unary = 'unary',
  Member = 'member',
  Object = 'obj',
  Array = 'arr',
  Conditional = 'cond',
  FunctionCall = 'call',
  Function = 'fn',
  Def = 'def',
  Spread = 'spread',
}

export interface LiteralNode extends AstNodeBase {
  type: AstNodeType.Literal;
  value: string | number | boolean;
}

export interface IdentifierNode extends AstNodeBase {
  type: AstNodeType.Identifier;
  value: string;
  isArg?: boolean;
  argIdx?: number;
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
  key?: AstNode;
  value: AstNode;
}

export interface ArrayNode extends AstNodeBase {
  type: AstNodeType.Array;
  value: AstNode[];
}

export interface SpreadNode extends AstNodeBase {
  type: AstNodeType.Spread;
  value: AstNode;
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

export interface FunctionNode extends AstNodeBase {
  type: AstNodeType.Function;
  argNames?: string[];
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
  expectBinOp = 2,
  expectObjKey = 3,
  objKey = 15,
  expectKeyValSep = 4,
  objVal = 16,
  objSpreadVal = 27,
  arrayVal = 17,
  spread = 26,
  computedMember = 5,
  member = 6,
  def = 7,
  defAssign = 8,
  defVal = 9,
  fn = 21,
  fnArg = 22,
  fnPostArg = 23,
  fnArrow = 24,
  fnExpr = 25,
  expectTransform = 10,
  postTransform = 11,
  exprTransform = 12,
  arg = 14,
  subExp = 13,
  ternaryMid = 18,
  ternaryEnd = 19,
  complete = 20,
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
