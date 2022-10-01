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

  describe('Grammars', () => {
    it('+', () => {
      const e = Evaluator(grammar, { x: { y: '1' } });
      expect(e.evaluate(toTree('+1'))).to.equal(1);
      expect(e.evaluate(toTree('2+1'))).to.equal(2 + 1);
      expect(e.evaluate(toTree('+x.y'))).to.equal(1);
    });
    it('-', () => {
      const e = Evaluator(grammar, { x: { y: '1' } });
      expect(e.evaluate(toTree('-1'))).to.equal(-1);
      expect(e.evaluate(toTree('2-1'))).to.equal(1);
      expect(e.evaluate(toTree('-x.y'))).to.equal(-1);
    });
    it('%', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('4%3'))).to.equal(1);
    });
    it('^', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('4^3'))).to.equal(4 ** 3);
    });
    it('==', () => {
      const e = Evaluator(grammar, { a: null, b: undefined });
      expect(e.evaluate(toTree('4 == 3'))).to.equal(false);
      expect(e.evaluate(toTree('4 == "4"'))).to.equal(false);
      expect(e.evaluate(toTree('a == a'))).to.equal(true);
    });
    it('!=', () => {
      const e = Evaluator(grammar, { a: null, b: undefined });
      expect(e.evaluate(toTree('4 != 3'))).to.equal(true);
      expect(e.evaluate(toTree('4 != "4"'))).to.equal(true);
      expect(e.evaluate(toTree('a != a'))).to.equal(false);
    });
    it('<', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('4<3'))).to.equal(false);
    });
    it('in', () => {
      const e = Evaluator(grammar, { foo: [1, 2, 3, 4], bar: { x: 4 } });
      expect(e.evaluate(toTree('4 in "1234"'))).to.equal(true);
      expect(e.evaluate(toTree('4 in foo'))).to.equal(true);
      expect(e.evaluate(toTree('4 in bar'))).to.equal(false);
    });
    it('!', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('!3'))).to.equal(false);
    });
    it('||', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('true||false'))).to.equal(true);
    });
  });
  describe('Unary Expression', () => {
    it('should convert string to number by +', () => {
      const context = { x: { y: '1' } };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('+x.y'))).to.equal(1);
    });
    it('should convert string to number by -', () => {
      const context = { x: { y: '1' } };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('-x.y'))).to.equal(-1);
    });
    it('should convert boolean to number by !', () => {
      const context = { x: { y: '1' } };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('!!x.y'))).to.equal(true);
    });
  });
  describe('Binary Expression', () => {
    it('should evaluate an arithmetic expression', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('(2 + 3) * 4'))).to.equal(20);
    });
    it('should evaluate right-to-left for ^', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('2 ^ 3 ^ 2'))).to.equal(2 ** 3 ** 2);
      expect(e.evaluate(toTree('2 ^ 3 ^ 2'))).to.equal(2 ** (3 ** 2));
      expect(e.evaluate(toTree('(2 ^ 3) ^ 2'))).to.equal((2 ** 3) ** 2);
    });
    it('should handle priority correctly', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('3 + 4 * 5'))).to.equal(23);
      expect(e.evaluate(toTree('(3 + 4) * 5'))).to.equal(35);
      expect(e.evaluate(toTree('4 * 3 ^ 2'))).to.equal(36);
      expect(e.evaluate(toTree('4 / 3 / 2'))).to.equal(4 / 3 / 2);
    });
    it('should apply the // operator', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('7 // 2'))).to.equal(3);
    });
    it('should evaluate a string concat', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('"Hello" + (4+4) + "Wo\\"rld"'))).to.equal('Hello8Wo"rld');
    });
    it('should evaluate a list concat', () => {
      const e = Evaluator(grammar, { a: [1, 2], b: [3, 4] });
      expect(e.evaluate(toTree('a+b'))).to.deep.equal([1, 2, 3, 4]);
    });
    it('should evaluate a object concat', () => {
      const e = Evaluator(grammar, { a: { x: 1 }, b: { y: 2 } });
      expect(e.evaluate(toTree('a+b'))).to.deep.equal({ x: 1, y: 2 });
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
  });
  describe('Ternary Expression', () => {
    it('should evaluate a conditional expression', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('"foo" ? 1 : 2'))).to.equal(1);
      expect(e.evaluate(toTree('"" ? 1 : 2'))).to.equal(2);
    });
    it('should allow missing consequent in ternary', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('"foo" ?: "bar"'))).to.equal('foo');
    });
  });
  describe('Member Access', () => {
    it('should evaluate an identifier chain', () => {
      const context = { foo: { baz: { bar: 'tek' } } };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo.baz.bar'))).to.equal(context.foo.baz.bar);
    });
    it('should make array elements addressable by index', () => {
      const context = {
        foo: {
          bar: [{ tek: 'tok' }, { tek: 'baz' }, { tek: 'foz' }],
        },
        a: [1, 2, 3],
      };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo.bar[1].tek'))).to.equal('baz');
      expect(e.evaluate(toTree('a[0]'))).to.equal(1);
      expect(e.evaluate(toTree('a[-1]'))).to.equal(3);
      expect(e.evaluate(toTree('a[1+1]'))).to.equal(3);
    });
    it('should allow index object properties', () => {
      const context = { foo: { baz: { bar: 'tek' } } };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo["ba" + "z"].bar'))).to.equal(context.foo.baz.bar);
    });
    it('should allow index on string literal', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('"abc"[0]'))).to.equal('a');
    });
    it('should allow access to literal properties', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('"foo".length'))).to.equal(3);
    });
  });
  describe('Optional Chain', () => {
    it('optional chain (null)?.bar.baz', () => {
      const context = {};
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo?.bar.baz'))).to.equal(undefined);
    });
    it('optional chain (...)?.bar.baz', () => {
      const context = { foo: {} };
      const e = Evaluator(grammar, context);
      expect(() => e.evaluate(toTree('foo?.bar.baz'))).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
    it('optional chain (null)?.["bar"].baz', () => {
      const context = {};
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo?.["bar"].baz'))).to.equal(undefined);
    });
    it('optional chain (...)?.["bar"].baz', () => {
      const context = { foo: {} };
      const e = Evaluator(grammar, context);
      expect(() => e.evaluate(toTree('foo?.["bar"].baz'))).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
    it('optional chain (null)?.().baz', () => {
      const context = {};
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('foo?.().baz'))).to.equal(undefined);
    });
    it('optional chain (...)?.().baz', () => {
      const context = { foo: () => undefined };
      const e = Evaluator(grammar, context);
      expect(() => e.evaluate(toTree('foo?.().baz'))).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
  });
  describe('Object', () => {
    it('should evaluate an object literal', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('{foo: {bar: "tek"}}'))).to.deep.equal({ foo: { bar: 'tek' } });
    });
    it('should evaluate an empty object literal', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('{}'))).to.deep.equal({});
    });
    it('should evaluate an object with expression key', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('{["a"+1]:1}'))).to.deep.equal({ a1: 1 });
    });
    it('should evaluate dot notation for object literals', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('{foo: "bar"}.foo'))).to.equal('bar');
    });
  });
  describe('Array', () => {
    it('should evaluate array literals', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('["foo", 1+2]'))).to.deep.equal(['foo', 3]);
    });
    it('should allow properties on empty arrays', () => {
      const context = { foo: {} };
      const e = Evaluator(grammar, context);
      expect(e.evaluate(toTree('[].baz'))).to.equal(undefined);
    });
  });
  describe('Transform', () => {
    it('should apply transforms', () => {
      const context = { foo: 10 };
      const half = (val: number) => val / 2;
      const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, half } }, context);
      expect(e.evaluate(toTree('foo|half + 3'))).to.equal(8);
    });
    it('should apply data function transforms', () => {
      const context = {
        foo: 10,
        double: (v: number) => v * 2,
        fns: {
          half: (v: number) => v / 2,
        },
      };
      const e = Evaluator(grammar, context);
      const tree1 = toTree('foo|double + 3');
      expect(e.evaluate(tree1)).to.equal(23);
      const tree2 = toTree('foo|(fns.half) + 3');
      expect(e.evaluate(tree2)).to.equal(8);
      const tree3 = toTree('foo|(fns["half"]) + 3');
      expect(e.evaluate(tree3)).to.equal(8);
      const tree4 = toTree('foo|(fns["ha" + "lf"]) + 3');
      expect(e.evaluate(tree4)).to.equal(8);
    });
    it('should apply a transform with multiple args', () => {
      const concat = (val: string, a1: string, a2: string, a3: string) => {
        return val + ': ' + a1 + a2 + a3;
      };
      const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, concat } });
      expect(e.evaluate(toTree('"foo"|concat("baz", "bar", "tek")')))
        .to.equal('foo: bazbartek');
    });
    it('should throw when transform does not exist', () => {
      const e = Evaluator(grammar, {});
      expect(() => e.evaluate(toTree('"hello"|world'))).to
        .throw('undefined is not a function');
    });
    it('should filter arrays', () => {
      const context = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const filter = (arr: any[], fn: (i: any) => any) => arr.filter(fn);
      const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, filter } }, context);
      expect(e.evaluate(toTree('foo.bar|filter(@.tek == "baz")')))
        .to.deep.equal([{ tek: 'baz' }]);
    });
    it('should map arrays', () => {
      const context = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const map = (arr: any[], fn: (i: any) => any) => arr.map(fn);
      const e = Evaluator({ ...grammar, transforms: { ...grammar.transforms, map } }, context);
      expect(e.evaluate(toTree('foo.bar|map({tek: "1"+(@.tek||@.tok)})')))
        .to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
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
  });
  describe('Lambda', () => {
    it('should apply lambda transforms', () => {
      const context = { foo: 10 };
      const e = Evaluator(grammar, context);
      const tree = toTree('foo|(@>10)?"large":"small"');
      expect(e.evaluate(tree)).to.equal('small');
    });
    it('should apply complex lambda transforms', () => {
      const context = { foo: 10 };
      const e = Evaluator(grammar, context);
      const tree = toTree('(foo+3+5)|({x:@/2,y:@/2+3})');
      expect(e.evaluate(tree)).to.deep.equal({ x: 9, y: 12 });
    });
    it('should apply lambda transforms with args', () => {
      const e = Evaluator(grammar);
      const tree = toTree('(1+2+3)|(@>@1)(4+5+6)?"great":"small"');
      expect(e.evaluate(tree)).to.equal('small');
    });
  });
  describe('Function', () => {
    it('should call function', () => {
      const context = { foo: 10, fns: { half: (v: number) => v / 2 } };
      const e = Evaluator(grammar, context);
      const tree1 = toTree('fns.half(foo) + 3');
      expect(e.evaluate(tree1)).to.equal(8);
      const tree2 = toTree('fns["half"](foo) + 3');
      expect(e.evaluate(tree2)).to.equal(8);
      const tree3 = toTree('fns["ha" + "lf"](foo) + 3');
      expect(e.evaluate(tree3)).to.equal(8);
    });
    it('should throw when function does not exist', () => {
      const e = Evaluator(grammar, {});
      expect(() => e.evaluate(toTree('world()'))).to
        .throw('undefined is not a function');
    });
  });
  describe('Whitespaces', () => {
    it('should handle an expression with arbitrary whitespace', () => {
      const e = Evaluator(grammar);
      expect(e.evaluate(toTree('(\t2\n+\n3) *\n4\n\r\n'))).to.equal(20);
    });
  });
});
