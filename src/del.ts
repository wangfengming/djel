import type { BinaryOpGrammarElement, UnaryOpGrammarElement } from './types';
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
      evaluate(context?: Record<string, any>): T {
        const evaluator = Evaluator(_grammar, context);
        return evaluator.evaluate(ast);
      },
    };
  };

  const evaluate = <T = any>(exp: string, context?: Record<string, any>) => {
    return compile<T>(exp).evaluate(context);
  };

  const addBinaryOps = (binaryOps: Record<string, Omit<BinaryOpGrammarElement, 'type'>>) => {
    grammar = { ...grammar, binaryOp: { ...grammar.binaryOp } };
    Object.keys(binaryOps).forEach((key) => {
      grammar.binaryOp[key] = { ...binaryOps[key], type: 'binaryOp' };
    });
    tokenizer.updateGrammarElements(grammar);
  };

  const addUnaryOps = (unaryOps: Record<string, Omit<UnaryOpGrammarElement, 'type'>>) => {
    grammar = { ...grammar, unaryOp: { ...grammar.unaryOp } };
    Object.keys(unaryOps).forEach((key) => {
      grammar.unaryOp[key] = { ...unaryOps[key], type: 'unaryOp' };
    });
    tokenizer.updateGrammarElements(grammar);
  };

  const addTransforms = (transforms: Record<string, Function>) => {
    grammar = {
      ...grammar,
      transforms: { ...grammar.transforms, ...transforms },
    };
  };

  const removeOp = (operator: string) => {
    if (grammar.binaryOp[operator] || grammar.unaryOp[operator]) {
      grammar = {
        ...grammar,
        unaryOp: { ...grammar.unaryOp },
        binaryOp: { ...grammar.binaryOp },
      };
      delete grammar.unaryOp[operator];
      delete grammar.binaryOp[operator];
      tokenizer.updateGrammarElements(grammar);
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
