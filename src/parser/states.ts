import type { State, StateType } from '../types';
import { handlers, subHandlers } from './handlers';

export const states: Record<StateType, State> = {
  expectOperand: {
    tokenTypes: {
      literal: { toState: 'expectBinOp' },
      identifier: { toState: 'identifier' },
      unaryOp: {},
      openParen: { toState: 'subExpression' },
      openCurly: { toState: 'expectObjKey', handler: handlers.objStart },
      openBracket: { toState: 'arrayVal', handler: handlers.arrayStart },
    },
  },
  expectBinOp: {
    tokenTypes: {
      binaryOp: { toState: 'expectOperand' },
      pipe: { toState: 'expectTransform' },
      question: { toState: 'ternaryMid', handler: handlers.ternaryStart },
    },
    completable: true,
  },
  expectObjKey: {
    tokenTypes: {
      identifier: { toState: 'expectKeyValSep', handler: handlers.objKey },
      closeCurly: { toState: 'expectBinOp' },
    },
  },
  expectKeyValSep: {
    tokenTypes: {
      colon: { toState: 'objVal' },
    },
  },
  identifier: {
    tokenTypes: {
      binaryOp: { toState: 'expectOperand' },
      openBracket: { toState: 'index' },
      pipe: { toState: 'expectTransform' },
      question: { toState: 'ternaryMid', handler: handlers.ternaryStart },
    },
    completable: true,
  },
  expectTransform: {
    tokenTypes: {
      identifier: { toState: 'postTransform', handler: handlers.transform },
      openParen: { toState: 'exprTransform', handler: handlers.transform },
    },
  },
  postTransform: {
    tokenTypes: {
      openParen: { toState: 'argVal' },
      binaryOp: { toState: 'expectOperand' },
      openBracket: { toState: 'index' },
      pipe: { toState: 'expectTransform' },
    },
    completable: true,
  },
  exprTransform: {
    subHandler: subHandlers.exprTransform,
    endStates: {
      closeParen: 'postTransformArgs',
    },
  },
  argVal: {
    subHandler: subHandlers.argVal,
    endStates: {
      comma: 'argVal',
      closeParen: 'postTransformArgs',
    },
  },
  postTransformArgs: {
    tokenTypes: {
      binaryOp: { toState: 'expectOperand' },
      openBracket: { toState: 'index' },
      pipe: { toState: 'expectTransform' },
    },
    completable: true,
  },
  index: {
    subHandler: subHandlers.index,
    endStates: {
      closeBracket: 'identifier',
    },
  },
  subExpression: {
    subHandler: subHandlers.subExpression,
    endStates: {
      closeParen: 'expectBinOp',
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
  complete: {},
};
