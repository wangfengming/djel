import type { BinaryOpGrammar, DelayBinaryOpGrammar, UnaryOpGrammar } from './types';
import { getGrammar } from './grammar';
import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { evaluate as _evaluate } from './evaluator';

export type { BinaryOpGrammar, DelayBinaryOpGrammar, UnaryOpGrammar } from './types';

export default function Djel() {
  const grammar = getGrammar();
  const tokenizer = Tokenizer(grammar);

  const compile = <T = any>(exp: string) => {
    const _grammar = grammar;
    const tokens = tokenizer.tokenize(exp);
    const parser = new Parser(_grammar);
    parser.addTokens(tokens);
    const ast = parser.complete();
    const evaluate = (variables?: any): T | undefined => {
      if (!ast) return undefined;
      return _evaluate(ast, { grammar: _grammar, variables });
    };
    return { evaluate };
  };

  const evaluate = <T = any>(exp: string, variables?: any) => {
    return compile<T>(exp).evaluate(variables);
  };

  const addBinaryOps = (binaryOps: Record<string, BinaryOpGrammar | DelayBinaryOpGrammar>) => {
    grammar.binaryOps = { ...grammar.binaryOps, ...binaryOps };
    tokenizer.updateGrammar(grammar);
  };

  const addUnaryOps = (unaryOps: Record<string, UnaryOpGrammar>) => {
    grammar.unaryOps = { ...grammar.unaryOps, ...unaryOps };
    tokenizer.updateGrammar(grammar);
  };

  const addTransforms = (transforms: Record<string, (...args: any[]) => any>) => {
    grammar.transforms = { ...grammar.transforms, ...transforms };
  };

  const removeOp = (operator: string) => {
    if (grammar.binaryOps[operator] || grammar.unaryOps[operator]) {
      delete grammar.unaryOps[operator];
      delete grammar.binaryOps[operator];
      tokenizer.updateGrammar(grammar);
    }
  };

  const removeTransform = (transformName: string) => {
    delete grammar.transforms[transformName];
  };

  return {
    compile,
    evaluate,
    addBinaryOps,
    addUnaryOps,
    addTransforms,
    removeOp,
    removeTransform,
  };
}
