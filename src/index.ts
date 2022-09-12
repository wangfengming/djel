import type { BinaryOpGrammar, DelayBinaryOpGrammar, UnaryOpGrammar } from './types';
import { getGrammar } from './grammar';
import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

export type { BinaryOpGrammar, DelayBinaryOpGrammar, UnaryOpGrammar } from './types';

/**
 * Djel is the Dynamic Javascript Expression Language, capable of parsing and
 * evaluating basic to complex expression strings into native Javascript objects.
 */
export default function Djel() {
  let grammar = getGrammar();
  let tokenizer = Tokenizer(grammar);

  /**
   * Compile a string expression. The returned object can then be
   * evaluated multiple times with different contexts, without generating any
   * additional string processing overhead.
   * @param {string} exp The expression to be compiled
   * @returns The expression object.
   */
  const compile = <T = any>(exp: string) => {
    const _grammar = grammar;
    const tokens = tokenizer.tokenize(exp);
    const parser = new Parser(_grammar);
    parser.addTokens(tokens);
    const ast = parser.complete();
    /**
     * Evaluates the expression within an optional context.
     * @param {Object} [context] A mapping of variables to values,
     *  which will be made accessible to the expression when evaluating it
     * @returns The result of the evaluation.
     */
    const evaluate = (context?: any): T => {
      const evaluator = Evaluator(_grammar, context);
      return evaluator.evaluate(ast);
    };
    return { ast, evaluate };
  };

  /**
   * Evaluates a string within an optional context.
   * @param {string} exp The expression to be evaluated
   * @param {Object} [context] A mapping of variables to values, which will be
   *      made accessible to the expression when evaluating it
   * @returns The result of the evaluation.
   */
  const evaluate = <T = any>(exp: string, context?: any) => {
    return compile<T>(exp).evaluate(context);
  };

  /**
   * Adds or replaces binary operators to Djel at the specified precedence. The higher the
   * precedence, the earlier the operator is applied in the order of operations.
   * For example, * has a higher precedence than +, because multiplication comes
   * before division.
   *
   * Please see grammar.ts for a listing of all default operators and their
   * precedence values in order to choose the appropriate precedence for the
   * new operator.
   */
  const addBinaryOps = (binaryOps: Record<string, BinaryOpGrammar | DelayBinaryOpGrammar>) => {
    grammar = { ...grammar, binaryOps: { ...grammar.binaryOps, ...binaryOps } };
    tokenizer.updateGrammar(grammar);
  };

  /**
   * Adds or replaces unary operators to Djel. Unary operators are currently only supported
   * on the left side of the value on which it will operate.
   */
  const addUnaryOps = (unaryOps: Record<string, UnaryOpGrammar>) => {
    grammar = { ...grammar, unaryOps: { ...grammar.unaryOps, ...unaryOps } };
    tokenizer.updateGrammar(grammar);
  };

  /**
   * Adds or replaces transform functions in this Djel instance.
   */
  const addTransforms = (transforms: Record<string, Function>) => {
    grammar = {
      ...grammar,
      transforms: { ...grammar.transforms, ...transforms },
    };
  };

  /**
   * Removes a binary or unary operator from the Djel grammar.
   * @param {string} operator The operator string to be removed
   */
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

  /**
   * Removes a transform from the grammar.
   * @param {string} transformName The transform to be removed
   */
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
