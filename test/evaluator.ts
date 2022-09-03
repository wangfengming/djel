import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Evaluator } from '../src/evaluator';

describe('Evaluator', () => {
  let grammar: ReturnType<typeof getGrammar>;
  let tokenizer: ReturnType<typeof Tokenizer>;
  beforeEach(() => {
    grammar = getGrammar();
    tokenizer = Tokenizer(grammar);
  });

  function toTree(exp: string) {
    const p = new Parser(grammar);
    p.addTokens(tokenizer.tokenize(exp));
    return p.complete();
  }

  it('should evaluate an arithmetic expression', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('(2 + 3) * 4'))).to.equal(20);
  });
  it('should evaluate a string concat', () => {
    const e = Evaluator(grammar);
    expect(e
      .evaluate(toTree('"Hello" + (4+4) + "Wo\\"rld"')),
    ).to.equal('Hello8Wo"rld');
  });
  it('should evaluate a true comparison expression', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('2 > 1'))).to.equal(true);
  });
  it('should evaluate a false comparison expression', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('2 <= 1'))).to.equal(false);
  });
  it('should evaluate a complex expression', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"foo" && 6 >= 6 && 0 + 1 && true'))).to.equal(true);
  });
  it('should evaluate an identifier chain', () => {
    const context = { foo: { baz: { bar: 'tek' } } };
    const e = Evaluator(grammar, context);
    expect(e.evaluate(toTree('foo.baz.bar'))).to.equal(context.foo.baz.bar);
  });
  it('should apply transforms', () => {
    const context = { foo: 10 };
    const half = (val: number) => val / 2;
    const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, half } }, context);
    expect(e.evaluate(toTree('foo|half + 3'))).to.equal(8);
  });
  it('should apply lambda transforms', () => {
    const context = { foo: 10 };
    const e = Evaluator(grammar, context);
    const tree = toTree('foo|(@/2) + 3');
    expect(e.evaluate(tree)).to.equal(8);
  });
  it('should apply complex lambda transforms', () => {
    const context = { foo: 10 };
    const e = Evaluator(grammar, context);
    const tree = toTree('foo|({x:@/2,y:@/2+3})');
    expect(e.evaluate(tree)).to.deep.equal({ x: 5, y: 8 });
  });
  it('should throw if apply invalid transforms', () => {
    const e = Evaluator(grammar);
    const tree = toTree('1|test');
    expect(() => e.evaluate(tree)).to.throw();
  });
  it('should apply data function transforms', () => {
    const context = { foo: 10, half: (v: number) => v / 2 };
    const e = Evaluator(grammar, context);
    const tree = toTree('foo|(half) + 3');
    expect(e.evaluate(tree)).to.equal(8);
  });
  it('should filter arrays', () => {
    const context = {
      foo: {
        bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
      },
    };
    const filter = (arr: any[], fn: (i: any) => any) => arr.filter(fn);
    const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, filter } }, context);
    expect(e
      .evaluate(toTree('foo.bar|filter(@.tek == "baz")')),
    ).to.deep.equal([{ tek: 'baz' }]);
  });
  it('should map arrays', () => {
    const context = {
      foo: {
        bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
      },
    };
    const map = (arr: any[], fn: (i: any) => any) => arr.map(fn);
    const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, map } }, context);
    expect(e
      .evaluate(toTree('foo.bar|map({tek: "1"+(@.tek||@.tok)})')),
    ).to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
  });
  it('should reduce arrays', () => {
    const context = {
      foo: {
        bar: [{ x: 1 }, { x: 2 }, { x: 3 }],
      },
    };
    const sum = <T>(arr: T[], by: (i: T) => number) => arr.reduce((n, i) => n + (by(i) || 0), 0);
    const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, sum } }, context);
    const ast = toTree('-(foo.bar|sum(@.x))');
    expect(e.evaluate(ast)).to.equal(-6);
  });
  it('should make array elements addressable by index', () => {
    const context = {
      foo: {
        bar: [{ tek: 'tok' }, { tek: 'baz' }, { tek: 'foz' }],
      },
    };
    const e = Evaluator(grammar, context);
    expect(e.evaluate(toTree('foo.bar[1].tek'))).to.equal('baz');
  });
  it('should allow index object properties', () => {
    const context = { foo: { baz: { bar: 'tek' } } };
    const e = Evaluator(grammar, context);
    expect(e
      .evaluate(toTree('foo["ba" + "z"].bar')),
    ).to.equal(context.foo.baz.bar);
  });
  it('should allow simple index on undefined objects', () => {
    const context = { foo: {} };
    const e = Evaluator(grammar, context);
    return expect(e.evaluate(toTree('foo.bar["baz"].tok'))).to.equal(undefined);
  });
  it('should throw when transform does not exist', () => {
    const e = Evaluator(grammar);
    return expect(() => e.evaluate(toTree('"hello"|world'))).to.throw();
  });
  it('should apply the DivFloor operator', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('7 // 2'))).to.equal(3);
  });
  it('should evaluate an object literal', () => {
    const e = Evaluator(grammar);
    expect(e
      .evaluate(toTree('{foo: {bar: "tek"}}')),
    ).to.deep.equal({ foo: { bar: 'tek' } });
  });
  it('should evaluate an empty object literal', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('{}'))).to.deep.equal({});
  });
  it('should evaluate a transform with multiple args', () => {
    const concat = (val: string, a1: string, a2: string, a3: string) => {
      return val + ': ' + a1 + a2 + a3;
    };
    const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, concat } });
    expect(e
      .evaluate(toTree('"foo"|concat("baz", "bar", "tek")')),
    ).to.equal('foo: bazbartek');
  });
  it('should evaluate dot notation for object literals', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('{foo: "bar"}.foo'))).to.equal('bar');
  });
  it('should allow access to literal properties', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"foo".length'))).to.equal(3);
  });
  it('should evaluate array literals', () => {
    const e = Evaluator(grammar);
    expect(e
      .evaluate(toTree('["foo", 1+2]')),
    ).to.deep.equal(['foo', 3]);
  });
  it('should allow properties on empty arrays', () => {
    const context = { foo: {} };
    const e = Evaluator(grammar, context);
    return expect(e.evaluate(toTree('[].baz'))).to.equal(undefined);
  });
  it('should apply the "in" operator to strings', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"bar" in "foobartek"'))).to.equal(true);
    expect(e.evaluate(toTree('"baz" in "foobartek"'))).to.equal(false);
  });
  it('should apply the "in" operator to arrays', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"bar" in ["foo","bar","tek"]'))).to.equal(true);
    expect(e.evaluate(toTree('"baz" in ["foo","bar","tek"]'))).to.equal(false);
  });
  it('should evaluate a conditional expression', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"foo" ? 1 : 2'))).to.equal(1);
    expect(e.evaluate(toTree('"" ? 1 : 2'))).to.equal(2);
  });
  it('should allow missing consequent in ternary', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('"foo" ?: "bar"'))).to.equal('foo');
  });
  it('should handle an expression with arbitrary whitespace', () => {
    const e = Evaluator(grammar);
    expect(e.evaluate(toTree('(\t2\n+\n3) *\n4\n\r\n'))).to.equal(20);
  });
});
