import type {
  ArrayNode,
  AstNode,
  BinaryNode,
  ConditionalNode,
  DefNode,
  EvaluateContext,
  FunctionCallNode,
  IdentifierNode,
  FunctionNode,
  LiteralNode,
  MemberNode,
  ObjectNode,
  UnaryNode,
} from './types';
import { AstNodeType } from './types';
import { hasOwn } from './utils';

const handlers = {
  [AstNodeType.Literal]: (ast: LiteralNode) => ast.value,
  [AstNodeType.Identifier]: (ast: IdentifierNode, context: EvaluateContext) => {
    if (context.args && ast.argIndex !== undefined) return context.args[ast.argIndex];
    if (context.locals && hasOwn(context.locals, ast.value)) return context.locals[ast.value];
    if (context.variables == null) {
      throw new Error(`No variables provided for evaluate`);
    }
    return context.variables[ast.value];
  },
  [AstNodeType.Unary]: (ast: UnaryNode, context: EvaluateContext) => {
    return context.grammar.unaryOps[ast.operator].fn(evaluate(ast.right, context));
  },
  [AstNodeType.Binary]: (ast: BinaryNode, context: EvaluateContext) => {
    const binaryOp = context.grammar.binaryOps[ast.operator];
    return binaryOp.delay
      ? binaryOp.fn(evaluate(ast.left, context), () => evaluate(ast.right, context))
      : binaryOp.fn(evaluate(ast.left, context), evaluate(ast.right, context));
  },
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
    if ((typeof left === 'string' || Array.isArray(left)) && key < 0) {
      return left[left.length + key];
    }
    return left[key];
  },
  [AstNodeType.Array]: (ast: ArrayNode, context: EvaluateContext) => ast.value.map((item) => evaluate(item, context)),
  [AstNodeType.Object]: (ast: ObjectNode, context: EvaluateContext) => {
    const result: any = {};
    ast.entries.forEach((entry) => {
      result[evaluate(entry.key, context)] = evaluate(entry.value, context);
    });
    return result;
  },
  [AstNodeType.Conditional]: (ast: ConditionalNode, context: EvaluateContext) => {
    const test = evaluate(ast.test, context);
    return test
      ? (ast.consequent ? evaluate(ast.consequent, context) : test)
      : evaluate(ast.alternate, context);
  },
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
  [AstNodeType.Function]: (ast: FunctionNode, context: EvaluateContext) => {
    return (...args: any[]) => {
      const newContext = { ...context, args };
      if (ast.argNames) {
        newContext.locals = { ...newContext.locals };
        ast.argNames.forEach((argName, index) => {
          newContext.locals![argName] = args[index];
        });
      }
      return evaluate(ast.expr, newContext);
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

export const evaluate = (ast: AstNode, context: EvaluateContext): any => {
  return handlers[ast.type](ast as any, context);
};
