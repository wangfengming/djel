import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';

describe('tokenizer', () => {
  let tokenizer: ReturnType<typeof Tokenizer>;
  beforeEach(() => {
    const grammar = getGrammar();
    tokenizer = Tokenizer(grammar);
  });

  describe('Elements', () => {
    it('should count a string as one element', () => {
      const str = '"foo"';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should support single-quote strings', () => {
      const str = '\'foo\'';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should support escaping double-quotes', () => {
      const str = '"f\\"oo"';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should support escaping double-quotes at end of double-quote strings', () => {
      const str = '"\\""';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should support escaping single-quotes', () => {
      const str = '\'f\\\'oo\'';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should support escaping single-quotes at end of single-quote strings', () => {
      const str = '\'\\\'\'';
      const elems = tokenizer.getElements(str);
      expect(elems).to.have.length(1);
      expect(elems[0]).to.equal(str);
    });
    it('should count an identifier as one element', () => {
      const str = 'alpha12345';
      const elems = tokenizer.getElements(str);
      expect(elems).to.deep.equal([str]);
    });
    it('should not split grammar elements out of transforms', () => {
      const str = 'inString';
      const elems = tokenizer.getElements(str);
      expect(elems).to.deep.equal([str]);
    });
  });

  describe('Tokens', () => {
    it('should unquote string elements', () => {
      const tokens = tokenizer.getTokens(['"foo \\"bar\\\\"']);
      expect(tokens).to.deep.equal([
        {
          type: 'literal',
          value: 'foo "bar\\',
          raw: '"foo \\"bar\\\\"',
        },
      ]);
    });
    it('should recognize booleans', () => {
      const tokens = tokenizer.getTokens(['true', 'false']);
      expect(tokens).to.deep.equal([
        {
          type: 'literal',
          value: true,
          raw: 'true',
        },
        {
          type: 'literal',
          value: false,
          raw: 'false',
        },
      ]);
    });
    it('should recognize numerics', () => {
      const tokens = tokenizer.getTokens(['-7.6', '20']);
      expect(tokens).to.deep.equal([
        {
          type: 'literal',
          value: -7.6,
          raw: '-7.6',
        },
        {
          type: 'literal',
          value: 20,
          raw: '20',
        },
      ]);
    });
    it('should recognize binary operators', () => {
      const tokens = tokenizer.getTokens(['/']);
      expect(tokens).to.deep.equal([
        {
          type: 'binaryOp',
          value: '/',
          raw: '/',
        },
      ]);
    });
    it('should recognize unary operators', () => {
      const tokens = tokenizer.getTokens(['!']);
      expect(tokens).to.deep.equal([
        {
          type: 'unaryOp',
          value: '!',
          raw: '!',
        },
      ]);
    });
    it('should recognize control characters', () => {
      const tokens = tokenizer.getTokens(['(']);
      expect(tokens).to.deep.equal([
        {
          type: 'openParen',
          value: '(',
          raw: '(',
        },
      ]);
    });
    it('should recognize identifiers', () => {
      const tokens = tokenizer.getTokens(['_foo9_bar']);
      expect(tokens).to.deep.equal([
        {
          type: 'identifier',
          value: '_foo9_bar',
          raw: '_foo9_bar',
        },
      ]);
    });
    it('should recognize identifiers of args', () => {
      const tokens = tokenizer.getTokens(['@1']);
      expect(tokens).to.deep.equal([
        {
          type: 'identifier',
          value: '@1',
          raw: '@1',
        },
      ]);
    });
  });

  describe('Tokenize', () => {
    it('should tokenize a full expression', () => {
      const tokens = tokenizer.tokenize('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]|filter(@3>1)');
      expect(tokens).to.deep.equal([
        { type: 'literal', value: 6, raw: '6' },
        { type: 'binaryOp', value: '+', raw: '+' },
        { type: 'identifier', value: 'x', raw: 'x ' },
        { type: 'binaryOp', value: '-', raw: '-  ' },
        { type: 'unaryOp', value: '-', raw: '-' },
        { type: 'literal', value: 17.55, raw: '17.55' },
        { type: 'binaryOp', value: '*', raw: '*' },
        { type: 'identifier', value: 'y', raw: 'y' },
        { type: 'binaryOp', value: '<=', raw: '<= ' },
        { type: 'unaryOp', value: '!', raw: '!' },
        { type: 'identifier', value: 'foo', raw: 'foo' },
        { type: 'binaryOp', value: '.', raw: '.' },
        { type: 'identifier', value: 'bar', raw: 'bar' },
        { type: 'openBracket', value: '[', raw: '[' },
        { type: 'literal', value: 'baz"foz', raw: '"baz\\"foz"' },
        { type: 'closeBracket', value: ']', raw: ']' },
        { type: 'pipe', value: '|', raw: '|' },
        { type: 'identifier', value: 'filter', raw: 'filter' },
        { type: 'openParen', value: '(', raw: '(' },
        { type: 'identifier', value: '@3', raw: '@3' },
        { type: 'binaryOp', value: '>', raw: '>' },
        { type: 'literal', value: 1, raw: '1' },
        { type: 'closeParen', value: ')', raw: ')' },
      ]);
    });
    it('should consider minus to be negative appropriately', () => {
      expect(tokenizer.tokenize('-1?-2:-3')).to.deep.equal([
        { type: 'unaryOp', value: '-', raw: '-' },
        { type: 'literal', value: 1, raw: '1' },
        { type: 'question', value: '?', raw: '?' },
        { type: 'unaryOp', value: '-', raw: '-' },
        { type: 'literal', value: 2, raw: '2' },
        { type: 'colon', value: ':', raw: ':' },
        { type: 'unaryOp', value: '-', raw: '-' },
        { type: 'literal', value: 3, raw: '3' },
      ]);
    });
  });

  describe('Comments', () => {
    it('should handle a complex mix of comments in single, multiline and value contexts', () => {
      const expression = [
        '6+x -  -17.55*y #end comment',
        '<= !foo.bar["baz\\"foz"] # with space',
        '&& b=="not a #comment" # is a comment',
        '# comment # 2nd comment',
      ].join('\n');
      const tokens = tokenizer.tokenize(expression);
      const ans = [
        { type: 'literal', value: 6, raw: '6' },
        { type: 'binaryOp', value: '+', raw: '+' },
        { type: 'identifier', value: 'x', raw: 'x ' },
        { type: 'binaryOp', value: '-', raw: '-  ' },
        { type: 'unaryOp', value: '-', raw: '-' },
        { type: 'literal', value: 17.55, raw: '17.55' },
        { type: 'binaryOp', value: '*', raw: '*' },
        { type: 'identifier', value: 'y', raw: 'y ' },
        { type: 'binaryOp', value: '<=', raw: '<= ' },
        { type: 'unaryOp', value: '!', raw: '!' },
        { type: 'identifier', value: 'foo', raw: 'foo' },
        { type: 'binaryOp', value: '.', raw: '.' },
        { type: 'identifier', value: 'bar', raw: 'bar' },
        { type: 'openBracket', value: '[', raw: '[' },
        { type: 'literal', value: 'baz"foz', raw: '"baz\\"foz"' },
        { type: 'closeBracket', value: ']', raw: '] ' },
        { type: 'binaryOp', value: '&&', raw: '&& ' },
        { type: 'identifier', value: 'b', raw: 'b' },
        { type: 'binaryOp', value: '==', raw: '==' },
        {
          type: 'literal',
          value: 'not a #comment',
          raw: '"not a #comment" ',
        },
      ];
      expect(tokens).to.deep.equal(ans);
    });
  });

  it('should throw with invalid token', () => {
    expect(() => tokenizer.tokenize('~')).to.throw;
  });
});
