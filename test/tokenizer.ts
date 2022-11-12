import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';
import { TokenType } from '../src/types';

describe('tokenizer', () => {
  const tokenize = (exp: string) => {
    const grammar = getGrammar();
    const tokenizer = Tokenizer(grammar);
    const tokens = tokenizer.tokenize(exp);
    return tokens;
  };

  it('symbol', () => {
    expect(tokenize(';[]{}:,()? . ?. ?.[ ?.(def=')).to.deep.equal([
      { type: TokenType.semi, value: ';', raw: ';' },
      { type: TokenType.openBracket, value: '[', raw: '[' },
      { type: TokenType.closeBracket, value: ']', raw: ']' },
      { type: TokenType.openCurly, value: '{', raw: '{' },
      { type: TokenType.closeCurly, value: '}', raw: '}' },
      { type: TokenType.colon, value: ':', raw: ':' },
      { type: TokenType.comma, value: ',', raw: ',' },
      { type: TokenType.openParen, value: '(', raw: '(' },
      { type: TokenType.closeParen, value: ')', raw: ')' },
      { type: TokenType.question, value: '?', raw: '? ' },
      { type: TokenType.dot, value: '.', raw: '. ' },
      { type: TokenType.optionalDot, value: '?.', raw: '?. ' },
      { type: TokenType.optionalBracket, value: '?.[', raw: '?.[ ' },
      { type: TokenType.optionalParen, value: '?.(', raw: '?.(' },
      { type: TokenType.def, value: 'def', raw: 'def' },
      { type: TokenType.assign, value: '=', raw: '=' },
    ]);
  });
  it('binaryOp', () => {
    const tokens = tokenize('1 + 1 - 1 * / // % ^ == != > >= < <= && || in');
    expect(tokens).to.deep.equal([
      { type: TokenType.literal, value: '1', raw: '1 ', literal: 1 },
      { type: TokenType.binaryOp, value: '+', raw: '+ ' },
      { type: TokenType.literal, value: '1', raw: '1 ', literal: 1 },
      { type: TokenType.binaryOp, value: '-', raw: '- ' },
      { type: TokenType.literal, value: '1', raw: '1 ', literal: 1 },
      { type: TokenType.binaryOp, value: '*', raw: '* ' },
      { type: TokenType.binaryOp, value: '/', raw: '/ ' },
      { type: TokenType.binaryOp, value: '//', raw: '// ' },
      { type: TokenType.binaryOp, value: '%', raw: '% ' },
      { type: TokenType.binaryOp, value: '^', raw: '^ ' },
      { type: TokenType.binaryOp, value: '==', raw: '== ' },
      { type: TokenType.binaryOp, value: '!=', raw: '!= ' },
      { type: TokenType.binaryOp, value: '>', raw: '> ' },
      { type: TokenType.binaryOp, value: '>=', raw: '>= ' },
      { type: TokenType.binaryOp, value: '<', raw: '< ' },
      { type: TokenType.binaryOp, value: '<=', raw: '<= ' },
      { type: TokenType.binaryOp, value: '&&', raw: '&& ' },
      { type: TokenType.binaryOp, value: '||', raw: '|| ' },
      { type: TokenType.binaryOp, value: 'in', raw: 'in' },
    ]);
  });
  it('unaryOp', () => {
    expect(tokenize('- ! +')).to.deep.equal([
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.unaryOp, value: '!', raw: '! ' },
      { type: TokenType.unaryOp, value: '+', raw: '+' },
    ]);
    expect(tokenize('-1?+2:!3')).to.deep.equal([
      { type: TokenType.unaryOp, value: '-', raw: '-' },
      { type: TokenType.literal, value: '1', raw: '1', literal: 1 },
      { type: TokenType.question, value: '?', raw: '?' },
      { type: TokenType.unaryOp, value: '+', raw: '+' },
      { type: TokenType.literal, value: '2', raw: '2', literal: 2 },
      { type: TokenType.colon, value: ':', raw: ':' },
      { type: TokenType.unaryOp, value: '!', raw: '!' },
      { type: TokenType.literal, value: '3', raw: '3', literal: 3 },
    ]);
  });
  it('prefer unaryOp', () => {
    expect(tokenize('- [ - ( - * - ( + - ? - : - , - = - ; -')).to.deep.equal([
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.openBracket, value: '[', raw: '[ ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.openParen, value: '(', raw: '( ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.binaryOp, value: '*', raw: '* ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.openParen, value: '(', raw: '( ' },
      { type: TokenType.unaryOp, value: '+', raw: '+ ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.question, value: '?', raw: '? ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.colon, value: ':', raw: ': ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.comma, value: ',', raw: ', ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.assign, value: '=', raw: '= ' },
      { type: TokenType.unaryOp, value: '-', raw: '- ' },
      { type: TokenType.semi, value: ';', raw: '; ' },
      { type: TokenType.unaryOp, value: '-', raw: '-' },
    ]);
  });
  it('string', () => {
    expect(tokenize('"foo \\"bar\\\\"')).to.deep.equal([
      {
        type: TokenType.literal,
        value: '"foo \\"bar\\\\"',
        raw: '"foo \\"bar\\\\"',
        literal: 'foo "bar\\',
      },
    ]);
  });
  it('boolean', () => {
    expect(tokenize('true false')).to.deep.equal([
      {
        type: TokenType.literal,
        value: 'true',
        raw: 'true ',
        literal: true,
      },
      {
        type: TokenType.literal,
        value: 'false',
        raw: 'false',
        literal: false,
      },
    ]);
  });
  it('number', () => {
    expect(tokenize('-7.6 20')).to.deep.equal([
      {
        type: TokenType.unaryOp,
        value: '-',
        raw: '-',
      },
      {
        type: TokenType.literal,
        value: '7.6',
        raw: '7.6 ',
        literal: 7.6,
      },
      {
        type: TokenType.literal,
        value: '20',
        raw: '20',
        literal: 20,
      },
    ]);
  });
  it('null', () => {
    expect(tokenize('null')).to.deep.equal([
      {
        type: TokenType.literal,
        value: 'null',
        raw: 'null',
        literal: null,
      },
    ]);
  });
  it('identifier', () => {
    expect(tokenize('_foo9_bar')).to.deep.equal([
      {
        type: TokenType.identifier,
        value: '_foo9_bar',
        raw: '_foo9_bar',
      },
    ]);
  });
  it('full expression', () => {
    const tokens = tokenize('6+x -  -17.55*y<= !foo.bar["baz\\"foz"]|filter(@3>@)');
    expect(tokens).to.deep.equal([
      { type: TokenType.literal, value: '6', raw: '6', literal: 6 },
      { type: TokenType.binaryOp, value: '+', raw: '+' },
      { type: TokenType.identifier, value: 'x', raw: 'x ' },
      { type: TokenType.binaryOp, value: '-', raw: '-  ' },
      { type: TokenType.unaryOp, value: '-', raw: '-' },
      { type: TokenType.literal, value: '17.55', raw: '17.55', literal: 17.55 },
      { type: TokenType.binaryOp, value: '*', raw: '*' },
      { type: TokenType.identifier, value: 'y', raw: 'y' },
      { type: TokenType.binaryOp, value: '<=', raw: '<= ' },
      { type: TokenType.unaryOp, value: '!', raw: '!' },
      { type: TokenType.identifier, value: 'foo', raw: 'foo' },
      { type: TokenType.dot, value: '.', raw: '.' },
      { type: TokenType.identifier, value: 'bar', raw: 'bar' },
      { type: TokenType.openBracket, value: '[', raw: '[' },
      { type: TokenType.literal, value: '"baz\\"foz"', raw: '"baz\\"foz"', literal: 'baz"foz' },
      { type: TokenType.closeBracket, value: ']', raw: ']' },
      { type: TokenType.pipe, value: '|', raw: '|' },
      { type: TokenType.identifier, value: 'filter', raw: 'filter' },
      { type: TokenType.openParen, value: '(', raw: '(' },
      { type: TokenType.identifier, value: '@3', raw: '@3', isArg: true, argIdx: 3 },
      { type: TokenType.binaryOp, value: '>', raw: '>' },
      { type: TokenType.identifier, value: '@', raw: '@', isArg: true, argIdx: 0 },
      { type: TokenType.closeParen, value: ')', raw: ')' },
    ]);
  });
  it('full expression with comments', () => {
    const expression = [
      '6+x -  -17.55*y #end comment',
      '<= !foo.bar["baz\\"foz"] # with space',
      '&& b=="not a #comment" # is a comment',
      '# comment # 2nd comment',
    ].join('\n');
    const tokens = tokenize(expression);
    expect(tokens).to.deep.equal([
      { type: TokenType.literal, value: '6', raw: '6', literal: 6 },
      { type: TokenType.binaryOp, value: '+', raw: '+' },
      { type: TokenType.identifier, value: 'x', raw: 'x ' },
      { type: TokenType.binaryOp, value: '-', raw: '-  ' },
      { type: TokenType.unaryOp, value: '-', raw: '-' },
      { type: TokenType.literal, value: '17.55', raw: '17.55', literal: 17.55 },
      { type: TokenType.binaryOp, value: '*', raw: '*' },
      { type: TokenType.identifier, value: 'y', raw: 'y ' },
      { type: TokenType.binaryOp, value: '<=', raw: '<= ' },
      { type: TokenType.unaryOp, value: '!', raw: '!' },
      { type: TokenType.identifier, value: 'foo', raw: 'foo' },
      { type: TokenType.dot, value: '.', raw: '.' },
      { type: TokenType.identifier, value: 'bar', raw: 'bar' },
      { type: TokenType.openBracket, value: '[', raw: '[' },
      { type: TokenType.literal, value: '"baz\\"foz"', raw: '"baz\\"foz"', literal: 'baz"foz' },
      { type: TokenType.closeBracket, value: ']', raw: '] ' },
      { type: TokenType.binaryOp, value: '&&', raw: '&& ' },
      { type: TokenType.identifier, value: 'b', raw: 'b' },
      { type: TokenType.binaryOp, value: '==', raw: '==' },
      {
        type: TokenType.literal,
        value: '"not a #comment"',
        raw: '"not a #comment" ',
        literal: 'not a #comment',
      },
    ]);
  });
  it('ignore the end semi', () => {
    const tokens = tokenize('def a = 1;');
    expect(tokens).to.deep.equal([
      { type: TokenType.def, value: 'def', raw: 'def ' },
      { type: TokenType.identifier, value: 'a', raw: 'a ' },
      { type: TokenType.assign, value: '=', raw: '= ' },
      { type: TokenType.literal, value: '1', raw: '1', literal: 1 },
    ]);
  });
  it('throw for invalid token', () => {
    expect(() => tokenize('~')).to
      .throw('Invalid expression token: ~');
  });
});
