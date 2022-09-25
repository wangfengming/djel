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

  describe('Literal', () => {
    it('literal boolean', () => {
      parser.addTokens(tokenizer.tokenize('true'));
      expect(parser.complete()).to.deep.equal({ type: 'Literal', value: true });
    });
    it('literal string', () => {
      parser.addTokens(tokenizer.tokenize('"Hello \\""'));
      expect(parser.complete()).to.deep.equal({ type: 'Literal', value: 'Hello "' });
    });
    it('literal number', () => {
      parser.addTokens(tokenizer.tokenize('10'));
      expect(parser.complete()).to.deep.equal({ type: 'Literal', value: 10 });
    });
  });
  describe('Identifier', () => {
    it('identifier', () => {
      parser.addTokens(tokenizer.tokenize('x'));
      expect(parser.complete()).to.deep.equal({ type: 'Identifier', value: 'x' });
    });
  });
  describe('Unary Expression', () => {
    it('unary operator', () => {
      parser.addTokens(tokenizer.tokenize('1*!!true-2'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '-',
        left: {
          type: 'Binary',
          operator: '*',
          left: { type: 'Literal', value: 1 },
          right: {
            type: 'Unary',
            operator: '!',
            right: {
              type: 'Unary',
              operator: '!',
              right: { type: 'Literal', value: true },
            },
          },
        },
        right: { type: 'Literal', value: 2 },
      });
    });
  });
  describe('Binary Expression', () => {
    it('binary expression 1+2', () => {
      parser.addTokens(tokenizer.tokenize('1+2'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: { type: 'Literal', value: 1 },
        right: { type: 'Literal', value: 2 },
      });
    });
    it('binary expression priority 2+3*4', () => {
      parser.addTokens(tokenizer.tokenize('2+3*4'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: { type: 'Literal', value: 2 },
        right: {
          type: 'Binary',
          operator: '*',
          left: { type: 'Literal', value: 3 },
          right: { type: 'Literal', value: 4 },
        },
      });
    });
    it('binary expression priority 2*3+4', () => {
      parser.addTokens(tokenizer.tokenize('2*3+4'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: {
          type: 'Binary',
          operator: '*',
          left: { type: 'Literal', value: 2 },
          right: { type: 'Literal', value: 3 },
        },
        right: { type: 'Literal', value: 4 },
      });
    });
    it('binary expression 2+3*4==5/6-7', () => {
      parser.addTokens(tokenizer.tokenize('2+3*4==5/6-7'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '==',
        left: {
          type: 'Binary',
          operator: '+',
          left: { type: 'Literal', value: 2 },
          right: {
            type: 'Binary',
            operator: '*',
            left: { type: 'Literal', value: 3 },
            right: { type: 'Literal', value: 4 },
          },
        },
        right: {
          type: 'Binary',
          operator: '-',
          left: {
            type: 'Binary',
            operator: '/',
            left: { type: 'Literal', value: 5 },
            right: { type: 'Literal', value: 6 },
          },
          right: { type: 'Literal', value: 7 },
        },
      });
    });
    it('sub expression (2+3)*4', () => {
      parser.addTokens(tokenizer.tokenize('(2+3)*4'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '*',
        left: {
          type: 'Binary',
          operator: '+',
          left: { type: 'Literal', value: 2 },
          right: { type: 'Literal', value: 3 },
        },
        right: { type: 'Literal', value: 4 },
      });
    });
    it('nested sub expression (4*(2+3))/5', () => {
      parser.addTokens(tokenizer.tokenize('(4*(2+3))/5'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '/',
        left: {
          type: 'Binary',
          operator: '*',
          left: { type: 'Literal', value: 4 },
          right: {
            type: 'Binary',
            operator: '+',
            left: { type: 'Literal', value: 2 },
            right: { type: 'Literal', value: 3 },
          },
        },
        right: { type: 'Literal', value: 5 },
      });
    });
    it('should correctly balance a binary op between complex identifiers', () => {
      parser.addTokens(tokenizer.tokenize('a.b == c.d'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '==',
        left: {
          type: 'Binary',
          operator: '.',
          left: { type: 'Identifier', value: 'a' },
          right: { type: 'Literal', value: 'b' },
        },
        right: {
          type: 'Binary',
          operator: '.',
          left: { type: 'Identifier', value: 'c' },
          right: { type: 'Literal', value: 'd' },
        },
      });
    });
  });
  describe('Ternary Expression', () => {
    it('ternary expression', () => {
      parser.addTokens(tokenizer.tokenize('foo ? 1 : 0'));
      expect(parser.complete()).to.deep.equal({
        type: 'Conditional',
        test: { type: 'Identifier', value: 'foo' },
        consequent: { type: 'Literal', value: 1 },
        alternate: { type: 'Literal', value: 0 },
      });
    });
    it('nested and grouped ternary expressions', () => {
      parser.addTokens(tokenizer.tokenize('foo ? (bar ? 1 : 2) : 3'));
      expect(parser.complete()).to.deep.equal({
        type: 'Conditional',
        test: { type: 'Identifier', value: 'foo' },
        consequent: {
          type: 'Conditional',
          test: { type: 'Identifier', value: 'bar' },
          consequent: { type: 'Literal', value: 1 },
          alternate: { type: 'Literal', value: 2 },
        },
        alternate: { type: 'Literal', value: 3 },
      });
    });
    it('nested, non-grouped ternary expressions', () => {
      parser.addTokens(tokenizer.tokenize('foo ? bar ? 1 : 2 : 3'));
      expect(parser.complete()).to.deep.equal({
        type: 'Conditional',
        test: { type: 'Identifier', value: 'foo' },
        consequent: {
          type: 'Conditional',
          test: { type: 'Identifier', value: 'bar' },
          consequent: { type: 'Literal', value: 1 },
          alternate: { type: 'Literal', value: 2 },
        },
        alternate: { type: 'Literal', value: 3 },
      });
    });
    it('ternary expression with objects', () => {
      parser.addTokens(tokenizer.tokenize('foo ? {bar: "tek"} : "baz"'));
      expect(parser.complete()).to.deep.equal({
        type: 'Conditional',
        test: { type: 'Identifier', value: 'foo' },
        consequent: {
          type: 'Object',
          entries: [
            {
              key: { type: 'Literal', value: 'bar' },
              value: { type: 'Literal', value: 'tek' },
            },
          ],
        },
        alternate: { type: 'Literal', value: 'baz' },
      });
    });
  });
  describe('Member Access', () => {
    it('member access .', () => {
      const tokens = tokenizer.tokenize('foo.bar.baz + 1');
      parser.addTokens(tokens);
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: {
          type: 'Binary',
          operator: '.',
          left: {
            type: 'Binary',
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
    it('member access []', () => {
      parser.addTokens(tokenizer.tokenize('foo.bar[1 + 1][0].baz[2]'));
      expect(parser.complete()).to.deep.equal({
        type: 'Member',
        left: {
          type: 'Binary',
          operator: '.',
          left: {
            type: 'Member',
            left: {
              type: 'Member',
              left: {
                type: 'Binary',
                operator: '.',
                left: { type: 'Identifier', value: 'foo' },
                right: { type: 'Literal', value: 'bar' },
              },
              right: {
                type: 'Binary',
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
    it('member access . for all operands', () => {
      parser.addTokens(tokenizer.tokenize('"foo".length + {foo: "bar"}.foo'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: {
          type: 'Binary',
          operator: '.',
          left: { type: 'Literal', value: 'foo' },
          right: { type: 'Literal', value: 'length' },
        },
        right: {
          type: 'Binary',
          operator: '.',
          left: {
            type: 'Object',
            entries: [
              {
                key: { type: 'Literal', value: 'foo' },
                value: { type: 'Literal', value: 'bar' },
              },
            ],
          },
          right: { type: 'Literal', value: 'foo' },
        },
      });
    });
    it('member access . on subexpressions', () => {
      parser.addTokens(tokenizer.tokenize('("foo" + "bar").length'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '.',
        left: {
          type: 'Binary',
          operator: '+',
          left: { type: 'Literal', value: 'foo' },
          right: { type: 'Literal', value: 'bar' },
        },
        right: { type: 'Literal', value: 'length' },
      });
    });
    it('member access . on arrays', () => {
      parser.addTokens(tokenizer.tokenize('["foo", "bar"].length'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '.',
        left: {
          type: 'Array',
          value: [
            { type: 'Literal', value: 'foo' },
            { type: 'Literal', value: 'bar' },
          ],
        },
        right: { type: 'Literal', value: 'length' },
      });
    });
  });
  describe('Whitespaces', () => {
    it('Whitespaces in expression', () => {
      parser.addTokens(tokenizer.tokenize('\t2\r\n+\n\r3\n\n'));
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: { type: 'Literal', value: 2 },
        right: { type: 'Literal', value: 3 },
      });
    });
  });
  describe('Throws', () => {
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
  describe('Object literals', () => {
    it('should handle object literals', () => {
      parser.addTokens(tokenizer.tokenize('{foo: "bar", tek: 1+2}'));
      expect(parser.complete()).to.deep.equal({
        type: 'Object',
        entries: [
          {
            key: { type: 'Literal', value: 'foo' },
            value: { type: 'Literal', value: 'bar' },
          },
          {
            key: { type: 'Literal', value: 'tek' },
            value: {
              type: 'Binary',
              operator: '+',
              left: { type: 'Literal', value: 1 },
              right: { type: 'Literal', value: 2 },
            },
          },
        ],
      });
    });
    it('should handle nested object literals', () => {
      parser.addTokens(tokenizer.tokenize('{foo: {bar: "tek"}}'));
      expect(parser.complete()).to.deep.equal({
        type: 'Object',
        entries: [
          {
            key: { type: 'Literal', value: 'foo' },
            value: {
              type: 'Object',
              entries: [
                {
                  key: { type: 'Literal', value: 'bar' },
                  value: { type: 'Literal', value: 'tek' },
                },
              ],
            },
          },
        ],
      });
    });
    it('should handle empty object literals', () => {
      parser.addTokens(tokenizer.tokenize('{}'));
      expect(parser.complete()).to.deep.equal({
        type: 'Object',
        entries: [],
      });
    });
    it('should handle object with expression key', () => {
      parser.addTokens(tokenizer.tokenize('{["a"+1]:1}'));
      expect(parser.complete()).to.deep.equal({
        type: 'Object',
        entries: [
          {
            key: {
              type: 'Binary',
              operator: '+',
              left: { type: 'Literal', value: 'a' },
              right: { type: 'Literal', value: 1 },
            },
            value: { type: 'Literal', value: 1 },
          },
        ],
      });
    });
  });
  describe('Array literals', () => {
    it('should handle array literals', () => {
      parser.addTokens(tokenizer.tokenize('["foo", 1+2]'));
      expect(parser.complete()).to.deep.equal({
        type: 'Array',
        value: [
          { type: 'Literal', value: 'foo' },
          {
            type: 'Binary',
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
        type: 'Array',
        value: [
          { type: 'Literal', value: 'foo' },
          {
            type: 'Array',
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
        type: 'Array',
        value: [],
      });
    });
  });
  describe('Transform', () => {
    it('should apply transforms', () => {
      const tokens = tokenizer.tokenize('foo.baz|tr+1');
      parser.addTokens(tokens);
      const ast = parser.complete();
      expect(ast).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: {
          type: 'FunctionCall',
          name: 'tr',
          args: [
            {
              type: 'Binary',
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
            type: 'Binary',
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
            type: 'Object',
            entries: [
              {
                key: { type: 'Literal', value: 'bar' },
                value: { type: 'Literal', value: 'tek' },
              },
            ],
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
  });
  describe('Lambda', () => {
    it('should apply lambda as transform', () => {
      const tokens = tokenizer.tokenize('arr|(@.x>1)+1');
      parser.addTokens(tokens);
      expect(parser.complete()).to.deep.equal({
        type: 'Binary',
        operator: '+',
        left: {
          type: 'FunctionCall',
          name: undefined,
          expr: {
            type: 'Lambda',
            expr: {
              type: 'Binary',
              operator: '>',
              left: {
                type: 'Binary',
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
              type: 'Conditional',
              test: {
                type: 'Binary',
                operator: '>',
                left: {
                  type: 'Binary',
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
  });
});
