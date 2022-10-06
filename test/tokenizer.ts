import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';

describe('tokenizer', () => {
  let tokenizer: ReturnType<typeof Tokenizer>;
  beforeEach(() => {
    const grammar = getGrammar();
    tokenizer = Tokenizer(grammar);
  });

  it('symbol', () => {
    expect(tokenizer.tokenize(';[]{}:,()? . ?. ?.[ ?.(def=')).to.deep.equal([
      { type: 'semi', value: ';', raw: ';' },
      { type: 'openBracket', value: '[', raw: '[' },
      { type: 'closeBracket', value: ']', raw: ']' },
      { type: 'openCurly', value: '{', raw: '{' },
      { type: 'closeCurly', value: '}', raw: '}' },
      { type: 'colon', value: ':', raw: ':' },
      { type: 'comma', value: ',', raw: ',' },
      { type: 'openParen', value: '(', raw: '(' },
      { type: 'closeParen', value: ')', raw: ')' },
      { type: 'question', value: '?', raw: '? ' },
      { type: 'dot', value: '.', raw: '. ' },
      { type: 'optionalDot', value: '?.', raw: '?. ' },
      { type: 'optionalBracket', value: '?.[', raw: '?.[ ' },
      { type: 'optionalParen', value: '?.(', raw: '?.(' },
      { type: 'def', value: 'def', raw: 'def' },
      { type: 'assign', value: '=', raw: '=' },
    ]);
  });
  it('binaryOp', () => {
    const tokens = tokenizer.tokenize('1 + 1 - 1 * / // % ^ == != > >= < <= && || in');
    expect(tokens).to.deep.equal([
      { type: 'literal', value: '1', raw: '1 ', literal: 1 },
      { type: 'binaryOp', value: '+', raw: '+ ' },
      { type: 'literal', value: '1', raw: '1 ', literal: 1 },
      { type: 'binaryOp', value: '-', raw: '- ' },
      { type: 'literal', value: '1', raw: '1 ', literal: 1 },
      { type: 'binaryOp', value: '*', raw: '* ' },
      { type: 'binaryOp', value: '/', raw: '/ ' },
      { type: 'binaryOp', value: '//', raw: '// ' },
      { type: 'binaryOp', value: '%', raw: '% ' },
      { type: 'binaryOp', value: '^', raw: '^ ' },
      { type: 'binaryOp', value: '==', raw: '== ' },
      { type: 'binaryOp', value: '!=', raw: '!= ' },
      { type: 'binaryOp', value: '>', raw: '> ' },
      { type: 'binaryOp', value: '>=', raw: '>= ' },
      { type: 'binaryOp', value: '<', raw: '< ' },
      { type: 'binaryOp', value: '<=', raw: '<= ' },
      { type: 'binaryOp', value: '&&', raw: '&& ' },
      { type: 'binaryOp', value: '||', raw: '|| ' },
      { type: 'binaryOp', value: 'in', raw: 'in' },
    ]);
  });
  it('unaryOp', () => {
    expect(tokenizer.tokenize('- ! +')).to.deep.equal([
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'unaryOp', value: '!', raw: '! ' },
      { type: 'unaryOp', value: '+', raw: '+' },
    ]);
    expect(tokenizer.tokenize('-1?+2:!3')).to.deep.equal([
      { type: 'unaryOp', value: '-', raw: '-' },
      { type: 'literal', value: '1', raw: '1', literal: 1 },
      { type: 'question', value: '?', raw: '?' },
      { type: 'unaryOp', value: '+', raw: '+' },
      { type: 'literal', value: '2', raw: '2', literal: 2 },
      { type: 'colon', value: ':', raw: ':' },
      { type: 'unaryOp', value: '!', raw: '!' },
      { type: 'literal', value: '3', raw: '3', literal: 3 },
    ]);
  });
  it('prefer unaryOp', () => {
    expect(tokenizer.tokenize('- [ - ( - * - ( + - ? - : - , - = - ; -')).to.deep.equal([
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'openBracket', value: '[', raw: '[ ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'openParen', value: '(', raw: '( ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'binaryOp', value: '*', raw: '* ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'openParen', value: '(', raw: '( ' },
      { type: 'unaryOp', value: '+', raw: '+ ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'question', value: '?', raw: '? ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'colon', value: ':', raw: ': ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'comma', value: ',', raw: ', ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'assign', value: '=', raw: '= ' },
      { type: 'unaryOp', value: '-', raw: '- ' },
      { type: 'semi', value: ';', raw: '; ' },
      { type: 'unaryOp', value: '-', raw: '-' },
    ]);
  });
  it('string', () => {
    expect(tokenizer.tokenize('"foo \\"bar\\\\"')).to.deep.equal([
      {
        type: 'literal',
        value: '"foo \\"bar\\\\"',
        raw: '"foo \\"bar\\\\"',
        literal: 'foo "bar\\',
      },
    ]);
  });
  it('boolean', () => {
    expect(tokenizer.tokenize('true false')).to.deep.equal([
      {
        type: 'literal',
        value: 'true',
        raw: 'true ',
        literal: true,
      },
      {
        type: 'literal',
        value: 'false',
        raw: 'false',
        literal: false,
      },
    ]);
  });
  it('number', () => {
    expect(tokenizer.tokenize('-7.6 20')).to.deep.equal([
      {
        type: 'unaryOp',
        value: '-',
        raw: '-',
      },
      {
        type: 'literal',
        value: '7.6',
        raw: '7.6 ',
        literal: 7.6,
      },
      {
        type: 'literal',
        value: '20',
        raw: '20',
        literal: 20,
      },
    ]);
  });
  it('null', () => {
    expect(tokenizer.tokenize('null')).to.deep.equal([
      {
        type: 'literal',
        value: 'null',
        raw: 'null',
        literal: null,
      },
    ]);
  });
  it('identifier', () => {
    expect(tokenizer.tokenize('_foo9_bar')).to.deep.equal([
      {
        type: 'identifier',
        value: '_foo9_bar',
        raw: '_foo9_bar',
      },
    ]);
  });
  it('full expression', () => {
    const tokens = tokenizer.tokenize('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]|filter(@3>@)');
    expect(tokens).to.deep.equal([
      { type: 'literal', value: '6', raw: '6', literal: 6 },
      { type: 'binaryOp', value: '+', raw: '+' },
      { type: 'identifier', value: 'x', raw: 'x ' },
      { type: 'binaryOp', value: '-', raw: '-  ' },
      { type: 'unaryOp', value: '-', raw: '-' },
      { type: 'literal', value: '17.55', raw: '17.55', literal: 17.55 },
      { type: 'binaryOp', value: '*', raw: '*' },
      { type: 'identifier', value: 'y', raw: 'y' },
      { type: 'binaryOp', value: '<=', raw: '<= ' },
      { type: 'unaryOp', value: '!', raw: '!' },
      { type: 'identifier', value: 'foo', raw: 'foo' },
      { type: 'dot', value: '.', raw: '.' },
      { type: 'identifier', value: 'bar', raw: 'bar' },
      { type: 'openBracket', value: '[', raw: '[' },
      { type: 'literal', value: '"baz\\"foz"', raw: '"baz\\"foz"', literal: 'baz"foz' },
      { type: 'closeBracket', value: ']', raw: ']' },
      { type: 'pipe', value: '|', raw: '|' },
      { type: 'identifier', value: 'filter', raw: 'filter' },
      { type: 'openParen', value: '(', raw: '(' },
      { type: 'identifier', value: '@3', raw: '@3', argIndex: 3 },
      { type: 'binaryOp', value: '>', raw: '>' },
      { type: 'identifier', value: '@', raw: '@', argIndex: 0 },
      { type: 'closeParen', value: ')', raw: ')' },
    ]);
  });
  it('full expression with comments', () => {
    const expression = [
      '6+x -  -17.55*y #end comment',
      '<= !foo.bar["baz\\"foz"] # with space',
      '&& b=="not a #comment" # is a comment',
      '# comment # 2nd comment',
    ].join('\n');
    const tokens = tokenizer.tokenize(expression);
    expect(tokens).to.deep.equal([
      { type: 'literal', value: '6', raw: '6', literal: 6 },
      { type: 'binaryOp', value: '+', raw: '+' },
      { type: 'identifier', value: 'x', raw: 'x ' },
      { type: 'binaryOp', value: '-', raw: '-  ' },
      { type: 'unaryOp', value: '-', raw: '-' },
      { type: 'literal', value: '17.55', raw: '17.55', literal: 17.55 },
      { type: 'binaryOp', value: '*', raw: '*' },
      { type: 'identifier', value: 'y', raw: 'y ' },
      { type: 'binaryOp', value: '<=', raw: '<= ' },
      { type: 'unaryOp', value: '!', raw: '!' },
      { type: 'identifier', value: 'foo', raw: 'foo' },
      { type: 'dot', value: '.', raw: '.' },
      { type: 'identifier', value: 'bar', raw: 'bar' },
      { type: 'openBracket', value: '[', raw: '[' },
      { type: 'literal', value: '"baz\\"foz"', raw: '"baz\\"foz"', literal: 'baz"foz' },
      { type: 'closeBracket', value: ']', raw: '] ' },
      { type: 'binaryOp', value: '&&', raw: '&& ' },
      { type: 'identifier', value: 'b', raw: 'b' },
      { type: 'binaryOp', value: '==', raw: '==' },
      {
        type: 'literal',
        value: '"not a #comment"',
        raw: '"not a #comment" ',
        literal: 'not a #comment',
      },
    ]);
  });
  it('ignore the end semi', () => {
    const tokens = tokenizer.tokenize('def a = 1;');
    expect(tokens).to.deep.equal([
      { type: 'def', value: 'def', raw: 'def ' },
      { type: 'identifier', value: 'a', raw: 'a ' },
      { type: 'assign', value: '=', raw: '= ' },
      { type: 'literal', value: '1', raw: '1', literal: 1 },
    ]);
  });
  it('throw for invalid token', () => {
    expect(() => tokenizer.tokenize('~')).to
      .throw('Invalid expression token: ~');
  });
});
