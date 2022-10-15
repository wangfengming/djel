import type {
  ArrayNode,
  AstNode,
  BinaryNode,
  ConditionalNode,
  DefNode,
  EvaluateContext,
  FunctionCallNode,
  IdentifierNode,
  LambdaNode,
  LiteralNode,
  MemberNode,
  ObjectNode,
  UnaryNode,
} from './types';
import { AstNodeType } from './types';
import { hasOwn } from './utils';

const handlers = {
  /**
   * Evaluates a Literal by returning its value property.
   */
  [AstNodeType.Literal]: (ast: LiteralNode) => ast.value,
  /**
   * Evaluates an Identifier by either stemming from the `args` by a lambda
   * or the `locals` by define local variables or the `variables`.
   */
  [AstNodeType.Identifier]: (ast: IdentifierNode, context: EvaluateContext) => {
    if (context.args && ast.argIndex !== undefined) return context.args[ast.argIndex];
    if (context.locals && hasOwn(context.locals, ast.value)) return context.locals[ast.value];
    if (context.variables == null) {
      throw new Error(`No variables provided for evaluate`);
    }
    return context.variables[ast.value];
  },
  /**
   * Evaluates a Unary expression by passing the right side through the
   * operator's eval function.
   */
  [AstNodeType.Unary]: (ast: UnaryNode, context: EvaluateContext) => {
    return context.grammar.unaryOps[ast.operator].fn(evaluate(ast.right, context));
  },
  /**
   * Evaluates a Binary node by running the Grammar's evaluator for the given operator.
   */
  [AstNodeType.Binary]: (ast: BinaryNode, context: EvaluateContext) => {
    const binaryOp = context.grammar.binaryOps[ast.operator];
    return binaryOp.delay
      ? binaryOp.fn(evaluate(ast.left, context), () => evaluate(ast.right, context))
      : binaryOp.fn(evaluate(ast.left, context), evaluate(ast.right, context));
  },
  /**
   * Evaluates a Member by applying it to the `left` value.
   */
  [AstNodeType.Member]: (ast: MemberNode, context: EvaluateContext) => {
    const left = evaluate(ast.left, context);
    if (left == null) {
      if (ast.optional) {
        context.leftNull = true;
        return;
      }
      if (ast.leftOptional && context.leftNull) {
        return;
      }
      throw new Error(`Cannot read properties of ${left} (reading ${evaluate(ast.right, context)})`);
    }
    context.leftNull = false;
    const key = evaluate(ast.right, context);
    if (Array.isArray(left) && key < 0) {
      return left[left.length + key];
    }
    return left[key];
  },
  /**
   * Evaluates an Array by returning its value, with each element
   * independently run through the evaluator.
   */
  [AstNodeType.Array]: (ast: ArrayNode, context: EvaluateContext) => ast.value.map((item) => evaluate(item, context)),
  /**
   * Evaluates an Object by returning its value, with each key
   * independently run through the evaluator.
   */
  [AstNodeType.Object]: (ast: ObjectNode, context: EvaluateContext) => {
    const result: any = {};
    ast.entries.forEach((entry) => {
      result[evaluate(entry.key, context)] = evaluate(entry.value, context);
    });
    return result;
  },
  /**
   * Evaluates a Conditional node by first evaluating its test branch,
   * and resolving with the consequent branch if the test is truthy, or the
   * alternate branch if it is not. If there is no consequent branch, the test
   * result will be used instead.
   */
  [AstNodeType.Conditional]: (ast: ConditionalNode, context: EvaluateContext) => {
    const test = evaluate(ast.test, context);
    return test
      ? (ast.consequent ? evaluate(ast.consequent, context) : test)
      : evaluate(ast.alternate, context);
  },
  /**
   * Evaluates a FunctionCall node by applying a function from the transforms map or a Lambda or context.
   */
  [AstNodeType.FunctionCall]: (ast: FunctionCallNode, context: EvaluateContext) => {
    const fn = ast.func.type === AstNodeType.Identifier
      ? (context.grammar.transforms[ast.func.value] || evaluate(ast.func, context))
      : evaluate(ast.func, context);
    if (fn == null) {
      if (ast.optional) {
        context.leftNull = true;
        return;
      }
      if (ast.leftOptional && context.leftNull) {
        return;
      }
    }
    if (typeof fn !== 'function') {
      throw new Error(`${fn} is not a function`);
    }
    context.leftNull = false;
    const args = ast.args.map((item) => evaluate(item, context));
    return fn(...args);
  },
  /**
   * Evaluates a Lambda expression by passing the args.
   */
  [AstNodeType.Lambda]: (ast: LambdaNode, context: EvaluateContext) => {
    return (...args: any[]) => {
      return evaluate(ast.expr, { ...context, args });
    };
  },
  [AstNodeType.Def]: (ast: DefNode, context: EvaluateContext) => {
    const newContext = { ...context, locals: { ...context.locals } };
    ast.defs.forEach((def) => {
      newContext.locals[def.name] = evaluate(def.value, newContext);
    });
    const result = evaluate(ast.statement, newContext);
    return result;
  },
};

/**
 * Evaluates an expression tree within the configured context.
 */
export const evaluate = (ast: AstNode, context: EvaluateContext): any => {
  return handlers[ast.type](ast as any, context);
};
