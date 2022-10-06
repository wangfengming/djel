import type { State, StateType } from '../types';
import { handlers, subHandlers } from './handlers';

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

const expectBinOpTokenTypes: State['tokenTypes'] = {
  binaryOp: { toState: 'expectOperand', handler: handlers.binaryOp },
  openBracket: { toState: 'computedMember', handler: handlers.computedMember },
  optionalBracket: { toState: 'computedMember', handler: handlers.computedMember },
  dot: { toState: 'member', handler: handlers.member },
  optionalDot: { toState: 'member', handler: handlers.member },
  openParen: { toState: 'argVal', handler: handlers.functionCall },
  optionalParen: { toState: 'argVal', handler: handlers.functionCall },
  pipe: { toState: 'expectTransform' },
  question: { toState: 'ternaryMid', handler: handlers.ternaryStart },
};

export const states: Record<StateType, State> = {
  expectOperand: {
    tokenTypes: {
      literal: { toState: 'expectBinOp', handler: handlers.literal },
      identifier: { toState: 'expectBinOp', handler: handlers.identifier },
      unaryOp: { handler: handlers.unaryOp },
      openParen: { toState: 'subExp' },
      openCurly: { toState: 'expectObjKey', handler: handlers.objStart },
      openBracket: { toState: 'arrayVal', handler: handlers.arrayStart },
      def: { toState: 'def' },
    },
  },
  expectBinOp: {
    tokenTypes: expectBinOpTokenTypes,
    completable: true,
  },
  member: {
    tokenTypes: {
      identifier: { toState: 'expectBinOp', handler: handlers.memberProperty },
    },
    completable: true,
  },
  expectObjKey: {
    tokenTypes: {
      identifier: { toState: 'expectKeyValSep', handler: handlers.objKey },
      literal: { toState: 'expectKeyValSep', handler: handlers.objKey },
      openBracket: { toState: 'objKey' },
      closeCurly: { toState: 'expectBinOp' },
    },
  },
  expectKeyValSep: {
    tokenTypes: {
      colon: { toState: 'objVal' },
    },
  },
  def: {
    tokenTypes: {
      identifier: { toState: 'defAssign', handler: handlers.defName },
    },
  },
  defAssign: {
    tokenTypes: {
      assign: { toState: 'defVal' },
    },
  },
  expectTransform: {
    tokenTypes: {
      identifier: { toState: 'postTransform', handler: handlers.transform },
      openParen: { toState: 'exprTransform', handler: handlers.transform },
    },
  },
  postTransform: {
    tokenTypes: {
      ...expectBinOpTokenTypes,
      openParen: { toState: 'argVal' },
      optionalParen: undefined,
    },
    completable: true,
  },
  computedMember: {
    subHandler: subHandlers.computedMemberProperty,
    endStates: {
      closeBracket: 'expectBinOp',
    },
  },
  subExp: {
    subHandler: subHandlers.subExp,
    endStates: {
      closeParen: 'expectBinOp',
    },
  },
  objKey: {
    subHandler: subHandlers.objKey,
    endStates: {
      closeBracket: 'expectKeyValSep',
    },
  },
  objVal: {
    subHandler: subHandlers.objVal,
    endStates: {
      comma: 'expectObjKey',
      closeCurly: 'expectBinOp',
    },
  },
  arrayVal: {
    subHandler: subHandlers.arrayVal,
    endStates: {
      comma: 'arrayVal',
      closeBracket: 'expectBinOp',
    },
  },
  defVal: {
    subHandler: subHandlers.defVal,
    endStates: {
      semi: 'expectOperand',
    },
  },
  exprTransform: {
    subHandler: subHandlers.exprTransform,
    endStates: {
      closeParen: 'postTransform',
    },
  },
  argVal: {
    subHandler: subHandlers.argVal,
    endStates: {
      comma: 'argVal',
      closeParen: 'expectBinOp',
    },
  },
  ternaryMid: {
    subHandler: subHandlers.ternaryMid,
    endStates: {
      colon: 'ternaryEnd',
    },
  },
  ternaryEnd: {
    subHandler: subHandlers.ternaryEnd,
    completable: true,
  },
  complete: {
    completable: true,
  },
};
