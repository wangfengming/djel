import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { AstNodeType } from '../src/types';

describe('Parser', () => {
  const parse = (exp: string) => {
    const grammar = getGrammar();
    const tokenizer = Tokenizer(grammar);
    const parser = new Parser(grammar);
    const tokens = tokenizer.tokenize(exp);
    parser.addTokens(tokens);
    const ast = parser.complete();
    return ast;
  };

  describe('Literal', () => {
    it('literal boolean', () => {
      expect(parse('true')).to.deep.equal({ type: AstNodeType.Literal, value: true });
    });
    it('literal string', () => {
      expect(parse('"Hello \\""')).to.deep.equal({ type: AstNodeType.Literal, value: 'Hello "' });
    });
    it('literal number', () => {
      expect(parse('10')).to.deep.equal({ type: AstNodeType.Literal, value: 10 });
    });
    it('literal null', () => {
      expect(parse('null')).to.deep.equal({ type: AstNodeType.Literal, value: null });
    });
  });
  describe('Identifier', () => {
    it('identifier', () => {
      expect(parse('x')).to.deep.equal({ type: AstNodeType.Identifier, value: 'x' });
    });
  });
  describe('Unary Expression', () => {
    it('unary operator', () => {
      expect(parse('1*!!true-2')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '-',
        left: {
          type: AstNodeType.Binary,
          operator: '*',
          left: { type: AstNodeType.Literal, value: 1 },
          right: {
            type: AstNodeType.Unary,
            operator: '!',
            right: {
              type: AstNodeType.Unary,
              operator: '!',
              right: { type: AstNodeType.Literal, value: true },
            },
          },
        },
        right: { type: AstNodeType.Literal, value: 2 },
      });
    });
  });
  describe('Binary Expression', () => {
    it('binary expression 1+2', () => {
      expect(parse('1+2')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: { type: AstNodeType.Literal, value: 1 },
        right: { type: AstNodeType.Literal, value: 2 },
      });
    });
    it('binary expression priority 2+3*4', () => {
      expect(parse('2+3*4')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: { type: AstNodeType.Literal, value: 2 },
        right: {
          type: AstNodeType.Binary,
          operator: '*',
          left: { type: AstNodeType.Literal, value: 3 },
          right: { type: AstNodeType.Literal, value: 4 },
        },
      });
    });
    it('binary expression priority 2*3+4', () => {
      expect(parse('2*3+4')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.Binary,
          operator: '*',
          left: { type: AstNodeType.Literal, value: 2 },
          right: { type: AstNodeType.Literal, value: 3 },
        },
        right: { type: AstNodeType.Literal, value: 4 },
      });
    });
    it('binary expression 2+3*4==5/6-7', () => {
      expect(parse('2+3*4==5/6-7')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '==',
        left: {
          type: AstNodeType.Binary,
          operator: '+',
          left: { type: AstNodeType.Literal, value: 2 },
          right: {
            type: AstNodeType.Binary,
            operator: '*',
            left: { type: AstNodeType.Literal, value: 3 },
            right: { type: AstNodeType.Literal, value: 4 },
          },
        },
        right: {
          type: AstNodeType.Binary,
          operator: '-',
          left: {
            type: AstNodeType.Binary,
            operator: '/',
            left: { type: AstNodeType.Literal, value: 5 },
            right: { type: AstNodeType.Literal, value: 6 },
          },
          right: { type: AstNodeType.Literal, value: 7 },
        },
      });
    });
    it('sub expression (2+3)*4', () => {
      expect(parse('(2+3)*4')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '*',
        left: {
          type: AstNodeType.Binary,
          operator: '+',
          left: { type: AstNodeType.Literal, value: 2 },
          right: { type: AstNodeType.Literal, value: 3 },
        },
        right: { type: AstNodeType.Literal, value: 4 },
      });
    });
    it('nested sub expression (4*(2+3))/5', () => {
      expect(parse('(4*(2+3))/5')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '/',
        left: {
          type: AstNodeType.Binary,
          operator: '*',
          left: { type: AstNodeType.Literal, value: 4 },
          right: {
            type: AstNodeType.Binary,
            operator: '+',
            left: { type: AstNodeType.Literal, value: 2 },
            right: { type: AstNodeType.Literal, value: 3 },
          },
        },
        right: { type: AstNodeType.Literal, value: 5 },
      });
    });
  });
  describe('Ternary Expression', () => {
    it('ternary expression', () => {
      expect(parse('foo ? 1 : 0')).to.deep.equal({
        type: AstNodeType.Conditional,
        test: { type: AstNodeType.Identifier, value: 'foo' },
        consequent: { type: AstNodeType.Literal, value: 1 },
        alternate: { type: AstNodeType.Literal, value: 0 },
      });
    });
    it('nested and grouped ternary expressions', () => {
      expect(parse('foo ? (bar ? 1 : 2) : 3')).to.deep.equal({
        type: AstNodeType.Conditional,
        test: { type: AstNodeType.Identifier, value: 'foo' },
        consequent: {
          type: AstNodeType.Conditional,
          test: { type: AstNodeType.Identifier, value: 'bar' },
          consequent: { type: AstNodeType.Literal, value: 1 },
          alternate: { type: AstNodeType.Literal, value: 2 },
        },
        alternate: { type: AstNodeType.Literal, value: 3 },
      });
    });
    it('nested, non-grouped ternary expressions', () => {
      expect(parse('foo ? bar ? 1 : 2 : 3')).to.deep.equal({
        type: AstNodeType.Conditional,
        test: { type: AstNodeType.Identifier, value: 'foo' },
        consequent: {
          type: AstNodeType.Conditional,
          test: { type: AstNodeType.Identifier, value: 'bar' },
          consequent: { type: AstNodeType.Literal, value: 1 },
          alternate: { type: AstNodeType.Literal, value: 2 },
        },
        alternate: { type: AstNodeType.Literal, value: 3 },
      });
    });
    it('ternary expression with objects', () => {
      expect(parse('foo ? {bar: "tek"} : "baz"')).to.deep.equal({
        type: AstNodeType.Conditional,
        test: { type: AstNodeType.Identifier, value: 'foo' },
        consequent: {
          type: AstNodeType.Object,
          entries: [
            {
              key: { type: AstNodeType.Literal, value: 'bar' },
              value: { type: AstNodeType.Literal, value: 'tek' },
            },
          ],
        },
        alternate: { type: AstNodeType.Literal, value: 'baz' },
      });
    });
  });
  describe('Member Access', () => {
    it('member access .', () => {
      expect(parse('foo.bar.baz + 1')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.Member,
          left: {
            type: AstNodeType.Member,
            left: {
              type: AstNodeType.Identifier,
              value: 'foo',
            },
            right: {
              type: AstNodeType.Literal,
              value: 'bar',
            },
          },
          right: {
            type: AstNodeType.Literal,
            value: 'baz',
          },
        },
        right: { type: AstNodeType.Literal, value: 1 },
      });
    });
    it('member access []', () => {
      expect(parse('foo.bar[1 + 1][0].baz[2]')).to.deep.equal({
        type: AstNodeType.Member,
        computed: true,
        left: {
          type: AstNodeType.Member,
          left: {
            type: AstNodeType.Member,
            computed: true,
            left: {
              type: AstNodeType.Member,
              computed: true,
              left: {
                type: AstNodeType.Member,
                left: { type: AstNodeType.Identifier, value: 'foo' },
                right: { type: AstNodeType.Literal, value: 'bar' },
              },
              right: {
                type: AstNodeType.Binary,
                operator: '+',
                left: { type: AstNodeType.Literal, value: 1 },
                right: { type: AstNodeType.Literal, value: 1 },
              },
            },
            right: { type: AstNodeType.Literal, value: 0 },
          },
          right: { type: AstNodeType.Literal, value: 'baz' },
        },
        right: { type: AstNodeType.Literal, value: 2 },
      });
    });
    it('member access . for all operands', () => {
      expect(parse('"foo".length + {foo: "bar"}.foo')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.Member,
          left: { type: AstNodeType.Literal, value: 'foo' },
          right: { type: AstNodeType.Literal, value: 'length' },
        },
        right: {
          type: AstNodeType.Member,
          left: {
            type: AstNodeType.Object,
            entries: [
              {
                key: { type: AstNodeType.Literal, value: 'foo' },
                value: { type: AstNodeType.Literal, value: 'bar' },
              },
            ],
          },
          right: { type: AstNodeType.Literal, value: 'foo' },
        },
      });
    });
    it('member access . on subexpressions', () => {
      expect(parse('("foo" + "bar").length')).to.deep.equal({
        type: AstNodeType.Member,
        left: {
          type: AstNodeType.Binary,
          operator: '+',
          left: { type: AstNodeType.Literal, value: 'foo' },
          right: { type: AstNodeType.Literal, value: 'bar' },
        },
        right: { type: AstNodeType.Literal, value: 'length' },
      });
    });
    it('member access . on arrays', () => {
      expect(parse('["foo", "bar"].length')).to.deep.equal({
        type: AstNodeType.Member,
        left: {
          type: AstNodeType.Array,
          value: [
            { type: AstNodeType.Literal, value: 'foo' },
            { type: AstNodeType.Literal, value: 'bar' },
          ],
        },
        right: { type: AstNodeType.Literal, value: 'length' },
      });
    });
    it('should correctly balance a binary op between complex identifiers', () => {
      expect(parse('a.b == c.d')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '==',
        left: {
          type: AstNodeType.Member,
          left: { type: AstNodeType.Identifier, value: 'a' },
          right: { type: AstNodeType.Literal, value: 'b' },
        },
        right: {
          type: AstNodeType.Member,
          left: { type: AstNodeType.Identifier, value: 'c' },
          right: { type: AstNodeType.Literal, value: 'd' },
        },
      });
    });
  });
  describe('Optional Chain', () => {
    it('member access ?.', () => {
      expect(parse('foo?.bar.baz')).to.deep.equal({
        type: AstNodeType.Member,
        leftOptional: true,
        left: {
          type: AstNodeType.Member,
          optional: true,
          left: {
            type: AstNodeType.Identifier,
            value: 'foo',
          },
          right: {
            type: AstNodeType.Literal,
            value: 'bar',
          },
        },
        right: {
          type: AstNodeType.Literal,
          value: 'baz',
        },
      });
    });
    it('member access ?.[', () => {
      expect(parse('foo?.["bar"].baz')).to.deep.equal({
        type: AstNodeType.Member,
        leftOptional: true,
        left: {
          type: AstNodeType.Member,
          computed: true,
          optional: true,
          left: {
            type: AstNodeType.Identifier,
            value: 'foo',
          },
          right: {
            type: AstNodeType.Literal,
            value: 'bar',
          },
        },
        right: {
          type: AstNodeType.Literal,
          value: 'baz',
        },
      });
    });
    it('member access ?.(', () => {
      expect(parse('foo?.().baz')).to.deep.equal({
        type: AstNodeType.Member,
        leftOptional: true,
        left: {
          type: AstNodeType.FunctionCall,
          optional: true,
          func: {
            type: AstNodeType.Identifier,
            value: 'foo',
          },
          args: [],
        },
        right: {
          type: AstNodeType.Literal,
          value: 'baz',
        },
      });
    });
    it('left optional [', () => {
      expect(parse('foo?.bar["baz"]')).to.deep.equal({
        type: AstNodeType.Member,
        computed: true,
        leftOptional: true,
        left: {
          type: AstNodeType.Member,
          optional: true,
          left: {
            type: AstNodeType.Identifier,
            value: 'foo',
          },
          right: {
            type: AstNodeType.Literal,
            value: 'bar',
          },
        },
        right: {
          type: AstNodeType.Literal,
          value: 'baz',
        },
      });
    });
    it('left optional (', () => {
      expect(parse('foo?.bar()')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        leftOptional: true,
        func: {
          type: AstNodeType.Member,
          optional: true,
          left: {
            type: AstNodeType.Identifier,
            value: 'foo',
          },
          right: {
            type: AstNodeType.Literal,
            value: 'bar',
          },
        },
        args: [],
      });
    });
  });
  describe('Whitespaces', () => {
    it('Whitespaces in expression', () => {
      expect(parse('\t2\r\n+\n\r3\n\n')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: { type: AstNodeType.Literal, value: 2 },
        right: { type: AstNodeType.Literal, value: 3 },
      });
    });
  });
  describe('Throws', () => {
    it('should throw if addToken after complete', () => {
      const grammar = getGrammar();
      const tokenizer = Tokenizer(grammar);
      const parser = new Parser(grammar);
      const tokens = tokenizer.tokenize('a.b == c.d');
      parser.addTokens(tokens);
      parser.complete();
      expect(() => parser.addTokens(tokens)).to
        .throw('Cannot add a new token to a completed Parser');
    });
    it('should throw if add invalid token', () => {
      expect(() => parse('a.b ~+= c.d')).to
        .throw('Invalid expression token: ~');
    });
    it('should throw if add unexpected token', () => {
      expect(() => parse('a.b =+= c.d')).to
        .throw('Token = unexpected in expression: a.b =');
    });
    it('should throw if token is not complete', () => {
      expect(() => parse('a.b == c.d +')).to
        .throw('Unexpected end of expression: a.b == c.d +');
    });
  });
  describe('Object literals', () => {
    it('should handle object literals', () => {
      expect(parse('{foo: "bar", tek: 1+2}')).to.deep.equal({
        type: AstNodeType.Object,
        entries: [
          {
            key: { type: AstNodeType.Literal, value: 'foo' },
            value: { type: AstNodeType.Literal, value: 'bar' },
          },
          {
            key: { type: AstNodeType.Literal, value: 'tek' },
            value: {
              type: AstNodeType.Binary,
              operator: '+',
              left: { type: AstNodeType.Literal, value: 1 },
              right: { type: AstNodeType.Literal, value: 2 },
            },
          },
        ],
      });
    });
    it('should handle nested object literals', () => {
      expect(parse('{foo: {bar: "tek"}}')).to.deep.equal({
        type: AstNodeType.Object,
        entries: [
          {
            key: { type: AstNodeType.Literal, value: 'foo' },
            value: {
              type: AstNodeType.Object,
              entries: [
                {
                  key: { type: AstNodeType.Literal, value: 'bar' },
                  value: { type: AstNodeType.Literal, value: 'tek' },
                },
              ],
            },
          },
        ],
      });
    });
    it('should handle empty object literals', () => {
      expect(parse('{}')).to.deep.equal({
        type: AstNodeType.Object,
        entries: [],
      });
    });
    it('should handle object with expression key', () => {
      expect(parse('{["a"+1]:1}')).to.deep.equal({
        type: AstNodeType.Object,
        entries: [
          {
            key: {
              type: AstNodeType.Binary,
              operator: '+',
              left: { type: AstNodeType.Literal, value: 'a' },
              right: { type: AstNodeType.Literal, value: 1 },
            },
            value: { type: AstNodeType.Literal, value: 1 },
          },
        ],
      });
    });
  });
  describe('Array literals', () => {
    it('should handle array literals', () => {
      expect(parse('["foo", 1+2]')).to.deep.equal({
        type: AstNodeType.Array,
        value: [
          { type: AstNodeType.Literal, value: 'foo' },
          {
            type: AstNodeType.Binary,
            operator: '+',
            left: { type: AstNodeType.Literal, value: 1 },
            right: { type: AstNodeType.Literal, value: 2 },
          },
        ],
      });
    });
    it('should handle nested array literals', () => {
      expect(parse('["foo", ["bar", "tek"]]')).to.deep.equal({
        type: AstNodeType.Array,
        value: [
          { type: AstNodeType.Literal, value: 'foo' },
          {
            type: AstNodeType.Array,
            value: [
              { type: AstNodeType.Literal, value: 'bar' },
              { type: AstNodeType.Literal, value: 'tek' },
            ],
          },
        ],
      });
    });
    it('should handle empty array literals', () => {
      expect(parse('[]')).to.deep.equal({
        type: AstNodeType.Array,
        value: [],
      });
    });
  });
  describe('Define variables', () => {
    it('def variables', () => {
      expect(parse('def a = 1; def b = 2; a + b')).to.deep.equal({
        type: AstNodeType.Def,
        defs: [
          { name: 'a', value: { type: AstNodeType.Literal, value: 1 } },
          { name: 'b', value: { type: AstNodeType.Literal, value: 2 } },
        ],
        statement: {
          type: AstNodeType.Binary,
          operator: '+',
          left: { type: AstNodeType.Identifier, value: 'a' },
          right: { type: AstNodeType.Identifier, value: 'b' },
        },
      });
    });
    it('def variables computed', () => {
      expect(parse('def a = 1; def b = a + 1; def c = a + b; a + b + c')).to.deep.equal({
        type: AstNodeType.Def,
        defs: [
          { name: 'a', value: { type: AstNodeType.Literal, value: 1 } },
          {
            name: 'b',
            value: {
              type: AstNodeType.Binary,
              operator: '+',
              left: { type: AstNodeType.Identifier, value: 'a' },
              right: { type: AstNodeType.Literal, value: 1 },
            },
          },
          {
            name: 'c',
            value: {
              type: AstNodeType.Binary,
              operator: '+',
              left: { type: AstNodeType.Identifier, value: 'a' },
              right: { type: AstNodeType.Identifier, value: 'b' },
            },
          },
        ],
        statement: {
          type: AstNodeType.Binary,
          operator: '+',
          left: {
            type: AstNodeType.Binary,
            operator: '+',
            left: { type: AstNodeType.Identifier, value: 'a' },
            right: { type: AstNodeType.Identifier, value: 'b' },
          },
          right: { type: AstNodeType.Identifier, value: 'c' },
        },
      });
    });
    it('def variables in sub-expression', () => {
      expect(parse('x ? (def a = 1; def b = 2; a + b) : y')).to.deep.equal({
        type: AstNodeType.Conditional,
        test: { type: AstNodeType.Identifier, value: 'x' },
        consequent: {
          type: AstNodeType.Def,
          defs: [
            { name: 'a', value: { type: AstNodeType.Literal, value: 1 } },
            { name: 'b', value: { type: AstNodeType.Literal, value: 2 } },
          ],
          statement: {
            type: AstNodeType.Binary,
            operator: '+',
            left: { type: AstNodeType.Identifier, value: 'a' },
            right: { type: AstNodeType.Identifier, value: 'b' },
          },
        },
        alternate: { type: AstNodeType.Identifier, value: 'y' },
      });
    });
    it('def variables without return will be ignored', () => {
      expect(parse('def a = 1;')).to.equal(undefined);
    });
    it('ignore then end semi in def variables', () => {
      expect(parse('def a = 1')).to.equal(undefined);
    });
    it('ignore then end semi in return', () => {
      expect(parse('def a = 1; a + 1;')).to.deep.equal({
        type: AstNodeType.Def,
        defs: [
          { name: 'a', value: { type: AstNodeType.Literal, value: 1 } },
        ],
        statement: {
          type: AstNodeType.Binary,
          operator: '+',
          left: { type: AstNodeType.Identifier, value: 'a' },
          right: { type: AstNodeType.Literal, value: 1 },
        },
      });
    });
  });
  describe('Transform', () => {
    it('should apply transforms', () => {
      expect(parse('foo.baz|tr+1')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.FunctionCall,
          func: { type: AstNodeType.Identifier, value: 'tr' },
          args: [
            {
              type: AstNodeType.Member,
              left: { type: AstNodeType.Identifier, value: 'foo' },
              right: { type: AstNodeType.Literal, value: 'baz' },
            },
          ],
        },
        right: { type: AstNodeType.Literal, value: 1 },
      });
    });
    it('should apply transforms with argument', () => {
      expect(parse('foo|tr1|tr2.baz|tr3({bar:"tek"})')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'tr3' },
        args: [
          {
            type: AstNodeType.Member,
            left: {
              type: AstNodeType.FunctionCall,
              func: { type: AstNodeType.Identifier, value: 'tr2' },
              args: [{
                type: AstNodeType.FunctionCall,
                func: { type: AstNodeType.Identifier, value: 'tr1' },
                args: [{
                  type: AstNodeType.Identifier,
                  value: 'foo',
                }],
              }],
            },
            right: { type: AstNodeType.Literal, value: 'baz' },
          },
          {
            type: AstNodeType.Object,
            entries: [
              {
                key: { type: AstNodeType.Literal, value: 'bar' },
                value: { type: AstNodeType.Literal, value: 'tek' },
              },
            ],
          },
        ],
      });
    });
    it('should handle multiple arguments in transforms', () => {
      expect(parse('foo|bar("tek", 5, true)')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'bar' },
        args: [
          { type: AstNodeType.Identifier, value: 'foo' },
          { type: AstNodeType.Literal, value: 'tek' },
          { type: AstNodeType.Literal, value: 5 },
          { type: AstNodeType.Literal, value: true },
        ],
      });
    });
    it('should apply context function as transform', () => {
      expect(parse('arr|(test)')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'test' },
        args: [
          { type: AstNodeType.Identifier, value: 'arr' },
        ],
      });
    });
  });
  describe('Function Call', () => {
    it('should apply transforms', () => {
      expect(parse('tr(foo.baz)+1')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.FunctionCall,
          func: { type: AstNodeType.Identifier, value: 'tr' },
          args: [
            {
              type: AstNodeType.Member,
              left: { type: AstNodeType.Identifier, value: 'foo' },
              right: { type: AstNodeType.Literal, value: 'baz' },
            },
          ],
        },
        right: { type: AstNodeType.Literal, value: 1 },
      });
    });
    it('should apply transforms with argument', () => {
      expect(parse('tr3(tr2(tr1(foo)).baz,{bar:"tek"})')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'tr3' },
        args: [
          {
            type: AstNodeType.Member,
            left: {
              type: AstNodeType.FunctionCall,
              func: { type: AstNodeType.Identifier, value: 'tr2' },
              args: [{
                type: AstNodeType.FunctionCall,
                func: { type: AstNodeType.Identifier, value: 'tr1' },
                args: [{
                  type: AstNodeType.Identifier,
                  value: 'foo',
                }],
              }],
            },
            right: { type: AstNodeType.Literal, value: 'baz' },
          },
          {
            type: AstNodeType.Object,
            entries: [
              {
                key: { type: AstNodeType.Literal, value: 'bar' },
                value: { type: AstNodeType.Literal, value: 'tek' },
              },
            ],
          },
        ],
      });
    });
    it('should handle multiple arguments in transforms', () => {
      expect(parse('bar(foo, "tek", 5, true)')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'bar' },
        args: [
          { type: AstNodeType.Identifier, value: 'foo' },
          { type: AstNodeType.Literal, value: 'tek' },
          { type: AstNodeType.Literal, value: 5 },
          { type: AstNodeType.Literal, value: true },
        ],
      });
    });
    it('should apply context function as transform', () => {
      expect(parse('test(arr)')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'test' },
        args: [
          { type: AstNodeType.Identifier, value: 'arr' },
        ],
      });
    });
  });
  describe('Lambda', () => {
    it('should apply lambda as transform', () => {
      expect(parse('arr|(@.x>1)+1')).to.deep.equal({
        type: AstNodeType.Binary,
        operator: '+',
        left: {
          type: AstNodeType.FunctionCall,
          func: {
            type: AstNodeType.Lambda,
            expr: {
              type: AstNodeType.Binary,
              operator: '>',
              left: {
                type: AstNodeType.Member,
                left: { type: AstNodeType.Identifier, value: '@', argIndex: 0 },
                right: { type: AstNodeType.Literal, value: 'x' },
              },
              right: { type: AstNodeType.Literal, value: 1 },
            },
          },
          args: [
            { type: AstNodeType.Identifier, value: 'arr' },
          ],
        },
        right: { type: AstNodeType.Literal, value: 1 },
      });
    });
    it('should apply transform with lambda arg', () => {
      expect(parse('arr|filter((@1.x>1)?2:3)')).to.deep.equal({
        type: AstNodeType.FunctionCall,
        func: { type: AstNodeType.Identifier, value: 'filter' },
        args: [
          { type: AstNodeType.Identifier, value: 'arr' },
          {
            type: AstNodeType.Lambda,
            expr: {
              type: AstNodeType.Conditional,
              test: {
                type: AstNodeType.Binary,
                operator: '>',
                left: {
                  type: AstNodeType.Member,
                  left: { type: AstNodeType.Identifier, value: '@1', argIndex: 1 },
                  right: { type: AstNodeType.Literal, value: 'x' },
                },
                right: { type: AstNodeType.Literal, value: 1 },
              },
              consequent: { type: AstNodeType.Literal, value: 2 },
              alternate: { type: AstNodeType.Literal, value: 3 },
            },
          },
        ],
      });
    });
  });
});
