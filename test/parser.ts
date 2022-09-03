import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';

describe('Parser', () => {
  let tokenizer: ReturnType<typeof Tokenizer>;
  let parser: Parser;

  beforeEach(() => {
    let grammar = getGrammar();
    tokenizer = Tokenizer(grammar);
    parser = new Parser(grammar);
  });

  it('should construct an AST for 1+2', () => {
    parser.addTokens(tokenizer.tokenize('1+2'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 1 },
      right: { type: 'Literal', value: 2 },
    });
  });
  it('should add heavier operations to the right for 2+3*4', () => {
    parser.addTokens(tokenizer.tokenize('2+3*4'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 2 },
      right: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Literal', value: 3 },
        right: { type: 'Literal', value: 4 },
      },
    });
  });
  it('should encapsulate for lighter operation in 2*3+4', () => {
    parser.addTokens(tokenizer.tokenize('2*3+4'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Literal', value: 2 },
        right: { type: 'Literal', value: 3 },
      },
      right: { type: 'Literal', value: 4 },
    });
  });
  it('should handle encapsulation of subtree in 2+3*4==5/6-7', () => {
    parser.addTokens(tokenizer.tokenize('2+3*4==5/6-7'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '==',
      left: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: 2 },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'Literal', value: 3 },
          right: { type: 'Literal', value: 4 },
        },
      },
      right: {
        type: 'BinaryExpression',
        operator: '-',
        left: {
          type: 'BinaryExpression',
          operator: '/',
          left: { type: 'Literal', value: 5 },
          right: { type: 'Literal', value: 6 },
        },
        right: { type: 'Literal', value: 7 },
      },
    });
  });
  it('should handle a unary operator', () => {
    parser.addTokens(tokenizer.tokenize('1*!!true-2'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '-',
      left: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Literal', value: 1 },
        right: {
          type: 'UnaryExpression',
          operator: '!',
          right: {
            type: 'UnaryExpression',
            operator: '!',
            right: { type: 'Literal', value: true },
          },
        },
      },
      right: { type: 'Literal', value: 2 },
    });
  });
  it('should handle a subexpression', () => {
    parser.addTokens(tokenizer.tokenize('(2+3)*4'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '*',
      left: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: 2 },
        right: { type: 'Literal', value: 3 },
      },
      right: { type: 'Literal', value: 4 },
    });
  });
  it('should handle nested subexpressions', () => {
    parser.addTokens(tokenizer.tokenize('(4*(2+3))/5'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '/',
      left: {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'Literal', value: 4 },
        right: {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Literal', value: 2 },
          right: { type: 'Literal', value: 3 },
        },
      },
      right: { type: 'Literal', value: 5 },
    });
  });
  it('should handle whitespace in an expression', () => {
    parser.addTokens(tokenizer.tokenize('\t2\r\n+\n\r3\n\n'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: { type: 'Literal', value: 2 },
      right: { type: 'Literal', value: 3 },
    });
  });
  it('should handle object literals', () => {
    parser.addTokens(tokenizer.tokenize('{foo: "bar", tek: 1+2}'));
    expect(parser.complete()).to.deep.equal({
      type: 'ObjectLiteral',
      value: {
        foo: { type: 'Literal', value: 'bar' },
        tek: {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Literal', value: 1 },
          right: { type: 'Literal', value: 2 },
        },
      },
    });
  });
  it('should handle nested object literals', () => {
    parser.addTokens(tokenizer.tokenize('{foo: {bar: "tek"}}'));
    expect(parser.complete()).to.deep.equal({
      type: 'ObjectLiteral',
      value: {
        foo: {
          type: 'ObjectLiteral',
          value: {
            bar: { type: 'Literal', value: 'tek' },
          },
        },
      },
    });
  });
  it('should handle empty object literals', () => {
    parser.addTokens(tokenizer.tokenize('{}'));
    expect(parser.complete()).to.deep.equal({
      type: 'ObjectLiteral',
      value: {},
    });
  });
  it('should handle array literals', () => {
    parser.addTokens(tokenizer.tokenize('["foo", 1+2]'));
    expect(parser.complete()).to.deep.equal({
      type: 'ArrayLiteral',
      value: [
        { type: 'Literal', value: 'foo' },
        {
          type: 'BinaryExpression',
          operator: '+',
          left: { type: 'Literal', value: 1 },
          right: { type: 'Literal', value: 2 },
        },
      ],
    });
  });
  it('should handle nested array literals', () => {
    parser.addTokens(tokenizer.tokenize('["foo", ["bar", "tek"]]'));
    expect(parser.complete()).to.deep.equal({
      type: 'ArrayLiteral',
      value: [
        { type: 'Literal', value: 'foo' },
        {
          type: 'ArrayLiteral',
          value: [
            { type: 'Literal', value: 'bar' },
            { type: 'Literal', value: 'tek' },
          ],
        },
      ],
    });
  });
  it('should handle empty array literals', () => {
    parser.addTokens(tokenizer.tokenize('[]'));
    expect(parser.complete()).to.deep.equal({
      type: 'ArrayLiteral',
      value: [],
    });
  });
  it('should chain traversed identifiers', () => {
    const tokens = tokenizer.tokenize('foo.bar.baz + 1');
    parser.addTokens(tokens);
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'BinaryExpression',
        operator: '.',
        left: {
          type: 'BinaryExpression',
          operator: '.',
          left: {
            type: 'Identifier',
            value: 'foo',
          },
          right: {
            type: 'Literal',
            value: 'bar',
          },
        },
        right: {
          type: 'Literal',
          value: 'baz',
        },
      },
      right: { type: 'Literal', value: 1 },
    });
  });
  it('should apply transforms', () => {
    const tokens = tokenizer.tokenize('foo.baz|tr+1');
    parser.addTokens(tokens);
    const ast = parser.complete();
    expect(ast).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'FunctionCall',
        name: 'tr',
        args: [
          {
            type: 'BinaryExpression',
            operator: '.',
            left: { type: 'Identifier', value: 'foo' },
            right: { type: 'Literal', value: 'baz' },
          },
        ],
      },
      right: { type: 'Literal', value: 1 },
    });
  });
  it('should apply transforms with argument', () => {
    parser.addTokens(tokenizer.tokenize('foo|tr1|tr2.baz|tr3({bar:"tek"})'));
    expect(parser.complete()).to.deep.equal({
      type: 'FunctionCall',
      name: 'tr3',
      args: [
        {
          type: 'BinaryExpression',
          operator: '.',
          left: {
            type: 'FunctionCall',
            name: 'tr2',
            args: [{
              type: 'FunctionCall',
              name: 'tr1',
              args: [{
                type: 'Identifier',
                value: 'foo',
              }],
            }],
          },
          right: { type: 'Literal', value: 'baz' },
        },
        {
          type: 'ObjectLiteral',
          value: {
            bar: { type: 'Literal', value: 'tek' },
          },
        },
      ],
    });
  });
  it('should handle multiple arguments in transforms', () => {
    parser.addTokens(tokenizer.tokenize('foo|bar("tek", 5, true)'));
    expect(parser.complete()).to.deep.equal({
      type: 'FunctionCall',
      name: 'bar',
      args: [
        { type: 'Identifier', value: 'foo' },
        { type: 'Literal', value: 'tek' },
        { type: 'Literal', value: 5 },
        { type: 'Literal', value: true },
      ],
    });
  });
  it('should apply lambda as transform', () => {
    const tokens = tokenizer.tokenize('arr|(@.x>1)+1');
    parser.addTokens(tokens);
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'FunctionCall',
        name: undefined,
        expr: {
          type: 'Lambda',
          expr: {
            type: 'BinaryExpression',
            operator: '>',
            left: {
              type: 'BinaryExpression',
              operator: '.',
              left: { type: 'Identifier', value: '@' },
              right: { type: 'Literal', value: 'x' },
            },
            right: { type: 'Literal', value: 1 },
          },
        },
        args: [
          { type: 'Identifier', value: 'arr' },
        ],
      },
      right: { type: 'Literal', value: 1 },
    });
  });
  it('should apply context function as transform', () => {
    const tokens = tokenizer.tokenize('arr|(test)');
    parser.addTokens(tokens);
    expect(parser.complete()).to.deep.equal({
      type: 'FunctionCall',
      name: undefined,
      expr: { type: 'Identifier', value: 'test' },
      args: [
        { type: 'Identifier', value: 'arr' },
      ],
    });
  });
  it('should apply transform with lambda arg', () => {
    const tokens = tokenizer.tokenize('arr|filter((@1.x>1)?2:3)');
    parser.addTokens(tokens);
    expect(parser.complete()).to.deep.equal({
      type: 'FunctionCall',
      name: 'filter',
      args: [
        { type: 'Identifier', value: 'arr' },
        {
          type: 'Lambda',
          expr: {
            type: 'ConditionalExpression',
            test: {
              type: 'BinaryExpression',
              operator: '>',
              left: {
                type: 'BinaryExpression',
                operator: '.',
                left: { type: 'Identifier', value: '@1' },
                right: { type: 'Literal', value: 'x' },
              },
              right: { type: 'Literal', value: 1 },
            },
            consequent: { type: 'Literal', value: 2 },
            alternate: { type: 'Literal', value: 3 },
          },
        },
      ],
    });
  });
  it('should apply index to identifiers', () => {
    parser.addTokens(tokenizer.tokenize('foo.bar[1 + 1][0].baz[2]'));
    expect(parser.complete()).to.deep.equal({
      type: 'IndexExpression',
      left: {
        type: 'BinaryExpression',
        operator: '.',
        left: {
          type: 'IndexExpression',
          left: {
            type: 'IndexExpression',
            left: {
              type: 'BinaryExpression',
              operator: '.',
              left: { type: 'Identifier', value: 'foo' },
              right: { type: 'Literal', value: 'bar' },
            },
            right: {
              type: 'BinaryExpression',
              operator: '+',
              left: { type: 'Literal', value: 1 },
              right: { type: 'Literal', value: 1 },
            },
          },
          right: { type: 'Literal', value: 0 },
        },
        right: { type: 'Literal', value: 'baz' },
      },
      right: { type: 'Literal', value: 2 },
    });
  });
  it('should allow dot notation for all operands', () => {
    parser.addTokens(tokenizer.tokenize('"foo".length + {foo: "bar"}.foo'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '+',
      left: {
        type: 'BinaryExpression',
        operator: '.',
        left: { type: 'Literal', value: 'foo' },
        right: { type: 'Literal', value: 'length' },
      },
      right: {
        type: 'BinaryExpression',
        operator: '.',
        left: {
          type: 'ObjectLiteral',
          value: {
            foo: { type: 'Literal', value: 'bar' },
          },
        },
        right: { type: 'Literal', value: 'foo' },
      },
    });
  });
  it('should allow dot notation on subexpressions', () => {
    parser.addTokens(tokenizer.tokenize('("foo" + "bar").length'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '.',
      left: {
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'Literal', value: 'foo' },
        right: { type: 'Literal', value: 'bar' },
      },
      right: { type: 'Literal', value: 'length' },
    });
  });
  it('should allow dot notation on arrays', () => {
    parser.addTokens(tokenizer.tokenize('["foo", "bar"].length'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '.',
      left: {
        type: 'ArrayLiteral',
        value: [
          { type: 'Literal', value: 'foo' },
          { type: 'Literal', value: 'bar' },
        ],
      },
      right: { type: 'Literal', value: 'length' },
    });
  });
  it('should handle a ternary expression', () => {
    parser.addTokens(tokenizer.tokenize('foo ? 1 : 0'));
    expect(parser.complete()).to.deep.equal({
      type: 'ConditionalExpression',
      test: { type: 'Identifier', value: 'foo' },
      consequent: { type: 'Literal', value: 1 },
      alternate: { type: 'Literal', value: 0 },
    });
  });
  it('should handle nested and grouped ternary expressions', () => {
    parser.addTokens(tokenizer.tokenize('foo ? (bar ? 1 : 2) : 3'));
    expect(parser.complete()).to.deep.equal({
      type: 'ConditionalExpression',
      test: { type: 'Identifier', value: 'foo' },
      consequent: {
        type: 'ConditionalExpression',
        test: { type: 'Identifier', value: 'bar' },
        consequent: { type: 'Literal', value: 1 },
        alternate: { type: 'Literal', value: 2 },
      },
      alternate: { type: 'Literal', value: 3 },
    });
  });
  it('should handle nested, non-grouped ternary expressions', () => {
    parser.addTokens(tokenizer.tokenize('foo ? bar ? 1 : 2 : 3'));
    expect(parser.complete()).to.deep.equal({
      type: 'ConditionalExpression',
      test: { type: 'Identifier', value: 'foo' },
      consequent: {
        type: 'ConditionalExpression',
        test: { type: 'Identifier', value: 'bar' },
        consequent: { type: 'Literal', value: 1 },
        alternate: { type: 'Literal', value: 2 },
      },
      alternate: { type: 'Literal', value: 3 },
    });
  });
  it('should handle ternary expression with objects', () => {
    parser.addTokens(tokenizer.tokenize('foo ? {bar: "tek"} : "baz"'));
    expect(parser.complete()).to.deep.equal({
      type: 'ConditionalExpression',
      test: { type: 'Identifier', value: 'foo' },
      consequent: {
        type: 'ObjectLiteral',
        value: {
          bar: { type: 'Literal', value: 'tek' },
        },
      },
      alternate: { type: 'Literal', value: 'baz' },
    });
  });
  it('should correctly balance a binary op between complex identifiers', () => {
    parser.addTokens(tokenizer.tokenize('a.b == c.d'));
    expect(parser.complete()).to.deep.equal({
      type: 'BinaryExpression',
      operator: '==',
      left: {
        type: 'BinaryExpression',
        operator: '.',
        left: { type: 'Identifier', value: 'a' },
        right: { type: 'Literal', value: 'b' },
      },
      right: {
        type: 'BinaryExpression',
        operator: '.',
        left: { type: 'Identifier', value: 'c' },
        right: { type: 'Literal', value: 'd' },
      },
    });
  });
  it('should throw if addToken after complete', () => {
    parser.addTokens(tokenizer.tokenize('a.b == c.d'));
    parser.complete();
    expect(() => parser.addTokens(tokenizer.tokenize('a.b == c.d'))).to.throw();
  });
  it('should throw if add unexpected token', () => {
    expect(() => parser.addTokens(tokenizer.tokenize('a.b =+= c.d'))).to.throw();
  });
  it('should throw if token is not complete', () => {
    parser.addTokens(tokenizer.tokenize('a.b == c.d +'));
    expect(() => parser.complete()).to.throw();
  });
});
