import type {
  AstNode,
  LiteralNode,
  IdentifierNode,
  UnaryExpressionNode,
  BinaryExpressionNode,
  IndexExpressionNode,
  ArrayLiteralNode,
  ObjectLiteralNode,
  ConditionalExpressionNode,
  FunctionCallNode,
  LambdaNode,
  Grammar,
} from './types';

export function Evaluator(grammar: Grammar, context?: any) {
  const handlers = {
    Literal: (ast: LiteralNode) => ast.value,
    Identifier: (ast: IdentifierNode) => context != null ? context[ast.value] : undefined,
    UnaryExpression: (ast: UnaryExpressionNode) => {
      return grammar.unaryOps[ast.operator].fn(evaluate(ast.right));
    },
    BinaryExpression: (ast: BinaryExpressionNode) => {
      return grammar.binaryOps[ast.operator].fn(evaluate(ast.left), evaluate(ast.right));
    },
    IndexExpression: (ast: IndexExpressionNode) => {
      const left = evaluate(ast.left);
      return left != null ? left[evaluate(ast.right)] : undefined;
    },
    ArrayLiteral: (ast: ArrayLiteralNode) => ast.value.map((item) => evaluate(item)),
    ObjectLiteral: (ast: ObjectLiteralNode) => {
      const result: any = {};
      Object.keys(ast.value).forEach((key) => {
        result[key] = evaluate(ast.value[key]);
      });
      return result;
    },
    ConditionalExpression: (ast: ConditionalExpressionNode) => {
      const test = evaluate(ast.test);
      return test
        ? (ast.consequent ? evaluate(ast.consequent) : test)
        : evaluate(ast.alternate);
    },
    FunctionCall: (ast: FunctionCallNode) => {
      const args = ast.args.map((item) => evaluate(item));
      const fn = ast.expr
        ? evaluate(ast.expr)
        : grammar.transforms[ast.name!];
      if (!fn) {
        throw new Error(`Cannot find transform ${ast.name}`);
      }
      return fn(...args);
    },
    Lambda: (ast: LambdaNode) => {
      return (..._args: any[]) => {
        const newContext = { ...context };
        _args.forEach((arg, index) => {
          newContext[`@${index}`] = arg;
        });
        newContext['@'] = _args[0];
        const evaluator = Evaluator(grammar, newContext);
        return evaluator.evaluate(ast.expr);
      };
    },
  };

  const evaluate = <T = any>(ast: AstNode): T => {
    return handlers[ast.type](ast as any);
  };

  return { evaluate };
}
