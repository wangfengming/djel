import type { BinaryOpGrammarElement, Grammar, UnaryOpGrammarElement } from './types';
import { getGrammar } from './grammar';
import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';
import { GrammarElement, OpGrammarElements } from './types';

export default function Del() {
  let grammar = getGrammar();
  let tokenizer = Tokenizer(grammar.elements);

  const compile = <T = any>(exp: string) => {
    const _grammar = grammar;
    const tokens = tokenizer.tokenize(exp);
    const parser = new Parser(_grammar.elements);
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

  const adOps = <T extends 'binaryOp' | 'unaryOp'>(
    type: T,
    grammarElements: Record<string, OpGrammarElements[T]>,
  ) => {
    grammar = {
      ...grammar,
      elements: { ...grammar.elements },
    };
    Object.keys(grammarElements).forEach((key) => {
      grammar.elements[key] = { ...grammarElements[key], type } as GrammarElement;
    });
    tokenizer.updateGrammarElements(grammar.elements);
  };

  const addBinaryOps = (grammarElements: Record<string, Omit<BinaryOpGrammarElement, 'type'>>) => {
    adOps('binaryOp', grammarElements);
  };

  const addUnaryOps = (grammarElements: Record<string, Omit<UnaryOpGrammarElement, 'type'>>) => {
    adOps('unaryOp', grammarElements);
  };

  const addTransforms = (transforms: Record<string, Function>) => {
    grammar = {
      ...grammar,
      transforms: { ...grammar.transforms, ...transforms },
    };
  };

  const removeOp = (operator: string) => {
    const grammarElement = grammar.elements[operator];
    if (grammarElement
      && (grammarElement.type === 'binaryOp' || grammarElement.type === 'unaryOp')) {
      grammar = {
        ...grammar,
        elements: { ...grammar.elements },
      };
      delete grammar.elements[operator];
      tokenizer.updateGrammarElements(grammar.elements);
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
