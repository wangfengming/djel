import type { BinaryOpGrammar, UnaryOpGrammar } from './types';
import { getGrammar } from './grammar';
import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

export default function Del() {
  let grammar = getGrammar();
  let tokenizer = Tokenizer(grammar);

  const compile = <T = any>(exp: string) => {
    const _grammar = grammar;
    const tokens = tokenizer.tokenize(exp);
    const parser = new Parser(_grammar);
    parser.addTokens(tokens);
    const ast = parser.complete();
    return {
      _ast: ast,
      evaluate(context?: any): T {
        const evaluator = Evaluator(_grammar, context);
        return evaluator.evaluate(ast);
      },
    };
  };

  const evaluate = <T = any>(exp: string, context?: any) => {
    return compile<T>(exp).evaluate(context);
  };

  const addBinaryOps = (binaryOps: Record<string, BinaryOpGrammar>) => {
    grammar = { ...grammar, binaryOps: { ...grammar.binaryOps, ...binaryOps } };
    tokenizer.updateGrammar(grammar);
  };

  const addUnaryOps = (unaryOps: Record<string, UnaryOpGrammar>) => {
    grammar = { ...grammar, unaryOps: { ...grammar.unaryOps, ...unaryOps } };
    tokenizer.updateGrammar(grammar);
  };

  const addTransforms = (transforms: Record<string, Function>) => {
    grammar = {
      ...grammar,
      transforms: { ...grammar.transforms, ...transforms },
    };
  };

  const removeOp = (operator: string) => {
    if (grammar.binaryOps[operator] || grammar.unaryOps[operator]) {
      grammar = {
        ...grammar,
        unaryOps: { ...grammar.unaryOps },
        binaryOps: { ...grammar.binaryOps },
      };
      delete grammar.unaryOps[operator];
      delete grammar.binaryOps[operator];
      tokenizer.updateGrammar(grammar);
    }
  };

  const removeTransform = (transformName: string) => {
    if (grammar.transforms[transformName]) {
      grammar = {
        ...grammar,
        transforms: { ...grammar.transforms },
      };
      delete grammar.transforms[transformName];
    }
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
