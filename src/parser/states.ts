import type { State } from '../types';
import { StateType, TokenType } from '../types';
import {
  astArgVal,
  astArrayVal,
  astComputedMemberProperty,
  astDefVal,
  astExprTransform,
  astFnExpr,
  astObjKey,
  astObjSpreadVal,
  astObjVal,
  astSpread,
  astSubExp,
  astTernaryEnd,
  astTernaryMid,
  tokenArrayStart,
  tokenBinaryOp,
  tokenComputedMember,
  tokenDefName,
  tokenFn,
  tokenFnArg,
  tokenFunctionCall,
  tokenIdentifier,
  tokenLiteral,
  tokenMember,
  tokenMemberProperty,
  tokenObjKey,
  tokenObjStart,
  tokenTernaryStart,
  tokenTransform,
  tokenUnaryOp,
} from './handlers';

const expectBinOpTokens: State['tokens'] = {
  [TokenType.binaryOp]: { toState: StateType.expectOperand, handler: tokenBinaryOp },
  [TokenType.openBracket]: { toState: StateType.computedMember, handler: tokenComputedMember },
  [TokenType.optionalBracket]: { toState: StateType.computedMember, handler: tokenComputedMember },
  [TokenType.dot]: { toState: StateType.member, handler: tokenMember },
  [TokenType.optionalDot]: { toState: StateType.member, handler: tokenMember },
  [TokenType.openParen]: { toState: StateType.arg, handler: tokenFunctionCall },
  [TokenType.optionalParen]: { toState: StateType.arg, handler: tokenFunctionCall },
  [TokenType.pipe]: { toState: StateType.expectTransform },
  [TokenType.question]: { toState: StateType.ternaryMid, handler: tokenTernaryStart },
};

export const states: Record<StateType, State> = {
  [StateType.expectOperand]: {
    tokens: {
      [TokenType.literal]: { toState: StateType.expectBinOp, handler: tokenLiteral },
      [TokenType.identifier]: { toState: StateType.expectBinOp, handler: tokenIdentifier },
      [TokenType.unaryOp]: { handler: tokenUnaryOp },
      [TokenType.openParen]: { toState: StateType.subExp },
      [TokenType.openCurly]: { toState: StateType.expectObjKey, handler: tokenObjStart },
      [TokenType.openBracket]: { toState: StateType.arrayVal, handler: tokenArrayStart },
      [TokenType.def]: { toState: StateType.def },
      [TokenType.fn]: { toState: StateType.fn, handler: tokenFn },
      [TokenType.spread]: { toState: StateType.spread },
    },
  },
  [StateType.expectBinOp]: {
    tokens: expectBinOpTokens,
    completable: true,
  },
  [StateType.member]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.expectBinOp, handler: tokenMemberProperty },
    },
    completable: true,
  },
  [StateType.computedMember]: {
    subHandler: astComputedMemberProperty,
    endTokens: {
      [TokenType.closeBracket]: StateType.expectBinOp,
    },
  },
  [StateType.arrayVal]: {
    subHandler: astArrayVal,
    endTokens: {
      [TokenType.comma]: StateType.arrayVal,
      [TokenType.closeBracket]: StateType.expectBinOp,
    },
  },
  [StateType.expectObjKey]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.expectKeyValSep, handler: tokenObjKey },
      [TokenType.literal]: { toState: StateType.expectKeyValSep, handler: tokenObjKey },
      [TokenType.openBracket]: { toState: StateType.objKey },
      [TokenType.closeCurly]: { toState: StateType.expectBinOp },
      [TokenType.spread]: { toState: StateType.objSpreadVal },
    },
  },
  [StateType.objKey]: {
    subHandler: astObjKey,
    endTokens: {
      [TokenType.closeBracket]: StateType.expectKeyValSep,
    },
  },
  [StateType.expectKeyValSep]: {
    tokens: {
      [TokenType.colon]: { toState: StateType.objVal },
    },
  },
  [StateType.objVal]: {
    subHandler: astObjVal,
    endTokens: {
      [TokenType.comma]: StateType.expectObjKey,
      [TokenType.closeCurly]: StateType.expectBinOp,
    },
  },
  [StateType.objSpreadVal]: {
    subHandler: astObjSpreadVal,
    endTokens: {
      [TokenType.comma]: StateType.expectObjKey,
      [TokenType.closeCurly]: StateType.expectBinOp,
    },
  },
  [StateType.spread]: {
    subHandler: astSpread,
    completable: true,
  },
  [StateType.def]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.defAssign, handler: tokenDefName },
    },
  },
  [StateType.defAssign]: {
    tokens: {
      [TokenType.assign]: { toState: StateType.defVal },
    },
  },
  [StateType.defVal]: {
    subHandler: astDefVal,
    endTokens: {
      [TokenType.semi]: StateType.expectOperand,
    },
  },
  [StateType.fn]: {
    tokens: {
      [TokenType.openParen]: { toState: StateType.fnArg },
    },
  },
  [StateType.fnArg]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.fnPostArg, handler: tokenFnArg },
      [TokenType.closeParen]: { toState: StateType.fnArrow },
    },
  },
  [StateType.fnPostArg]: {
    tokens: {
      [TokenType.comma]: { toState: StateType.fnArg },
      [TokenType.closeParen]: { toState: StateType.fnArrow },
    },
  },
  [StateType.fnArrow]: {
    tokens: {
      [TokenType.arrow]: { toState: StateType.fnExpr },
    },
  },
  [StateType.fnExpr]: {
    subHandler: astFnExpr,
    completable: true,
  },
  [StateType.expectTransform]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.postTransform, handler: tokenTransform },
      [TokenType.openParen]: { toState: StateType.exprTransform, handler: tokenTransform },
    },
  },
  [StateType.postTransform]: {
    tokens: {
      ...expectBinOpTokens,
      [TokenType.openParen]: { toState: StateType.arg },
      [TokenType.optionalParen]: undefined,
    },
    completable: true,
  },
  [StateType.exprTransform]: {
    subHandler: astExprTransform,
    endTokens: {
      [TokenType.closeParen]: StateType.postTransform,
    },
  },
  [StateType.arg]: {
    subHandler: astArgVal,
    endTokens: {
      [TokenType.comma]: StateType.arg,
      [TokenType.closeParen]: StateType.expectBinOp,
    },
  },
  [StateType.subExp]: {
    subHandler: astSubExp,
    endTokens: {
      [TokenType.closeParen]: StateType.expectBinOp,
    },
  },
  [StateType.ternaryMid]: {
    subHandler: astTernaryMid,
    endTokens: {
      [TokenType.colon]: StateType.ternaryEnd,
    },
  },
  [StateType.ternaryEnd]: {
    subHandler: astTernaryEnd,
    completable: true,
  },
  [StateType.complete]: {
    completable: true,
  },
};
