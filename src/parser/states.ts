import type { State } from '../types';
import { StateType, TokenType } from '../types';
import {
  astArgVal,
  astArrayVal,
  astComputedMemberProperty,
  astDefVal,
  astExprTransform,
  astObjKey,
  astObjVal,
  astSubExp,
  astTernaryEnd,
  astTernaryMid,
  tokenArrayStart,
  tokenBinaryOp,
  tokenComputedMember,
  tokenDefName,
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

/**
 * A mapping of all states in the finite state machine to a set of instructions
 * for handling or transitioning into other states. Each state can be handled
 * in one of two schemes: a tokenType map, or a subHandler.
 *
 * Standard expression elements are handled through the tokenType object. This
 * is an object map of all legal token types to encounter in this state (and
 * any unexpected token types will generate a thrown error) to an options
 * object that defines how they're handled.  The available options are:
 *
 *   {string} toState: The name of the state to which to transition immediately
 *      after handling this token
 *   {string} handler: The handler function to call when this token type is
 *      encountered in this state. If the handler function does not exist,
 *      no call will be made and no error will be generated. This is useful
 *      for tokens whose sole purpose is to transition to other states.
 *
 * States that consume a subexpression should define a subHandler, the
 * function to be called with an expression tree argument when the
 * subexpression is complete. Completeness is determined through the
 * endStates object, which maps tokens on which an expression should end to the
 * state to which to transition once the subHandler function has been called.
 *
 * Additionally, any state in which it is legal to mark the AST as completed
 * should have a 'completable' property set to boolean true.  Attempting to
 * call Parser#complete in any state without this property will result
 * in a thrown Error.
 */

const expectBinOpTokens: State['tokens'] = {
  [TokenType.binaryOp]: { toState: StateType.expectOperand, handler: tokenBinaryOp },
  [TokenType.openBracket]: { toState: StateType.computedMember, handler: tokenComputedMember },
  [TokenType.optionalBracket]: { toState: StateType.computedMember, handler: tokenComputedMember },
  [TokenType.dot]: { toState: StateType.member, handler: tokenMember },
  [TokenType.optionalDot]: { toState: StateType.member, handler: tokenMember },
  [TokenType.openParen]: { toState: StateType.argVal, handler: tokenFunctionCall },
  [TokenType.optionalParen]: { toState: StateType.argVal, handler: tokenFunctionCall },
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
  [StateType.expectObjKey]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.expectKeyValSep, handler: tokenObjKey },
      [TokenType.literal]: { toState: StateType.expectKeyValSep, handler: tokenObjKey },
      [TokenType.openBracket]: { toState: StateType.objKey },
      [TokenType.closeCurly]: { toState: StateType.expectBinOp },
    },
  },
  [StateType.expectKeyValSep]: {
    tokens: {
      [TokenType.colon]: { toState: StateType.objVal },
    },
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
  [StateType.expectTransform]: {
    tokens: {
      [TokenType.identifier]: { toState: StateType.postTransform, handler: tokenTransform },
      [TokenType.openParen]: { toState: StateType.exprTransform, handler: tokenTransform },
    },
  },
  [StateType.postTransform]: {
    tokens: {
      ...expectBinOpTokens,
      [TokenType.openParen]: { toState: StateType.argVal },
      [TokenType.optionalParen]: undefined,
    },
    completable: true,
  },
  [StateType.computedMember]: {
    subHandler: astComputedMemberProperty,
    endTokens: {
      [TokenType.closeBracket]: StateType.expectBinOp,
    },
  },
  [StateType.subExp]: {
    subHandler: astSubExp,
    endTokens: {
      [TokenType.closeParen]: StateType.expectBinOp,
    },
  },
  [StateType.objKey]: {
    subHandler: astObjKey,
    endTokens: {
      [TokenType.closeBracket]: StateType.expectKeyValSep,
    },
  },
  [StateType.objVal]: {
    subHandler: astObjVal,
    endTokens: {
      [TokenType.comma]: StateType.expectObjKey,
      [TokenType.closeCurly]: StateType.expectBinOp,
    },
  },
  [StateType.arrayVal]: {
    subHandler: astArrayVal,
    endTokens: {
      [TokenType.comma]: StateType.arrayVal,
      [TokenType.closeBracket]: StateType.expectBinOp,
    },
  },
  [StateType.defVal]: {
    subHandler: astDefVal,
    endTokens: {
      [TokenType.semi]: StateType.expectOperand,
    },
  },
  [StateType.exprTransform]: {
    subHandler: astExprTransform,
    endTokens: {
      [TokenType.closeParen]: StateType.postTransform,
    },
  },
  [StateType.argVal]: {
    subHandler: astArgVal,
    endTokens: {
      [TokenType.comma]: StateType.argVal,
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
