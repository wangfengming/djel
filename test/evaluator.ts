import { expect } from 'chai';
import { getGrammar } from '../src/grammar';
import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { evaluate as _evaluate } from '../src/evaluator';

describe('Evaluator', () => {
  const evaluate = (exp: string, variables?: any, transforms?: Record<string, (...args: any[]) => any>) => {
    const grammar = getGrammar();
    grammar.transforms = { ...grammar.transforms, ...transforms };
    const tokenizer = Tokenizer(grammar);
    const parser = new Parser(grammar);
    const tokens = tokenizer.tokenize(exp);
    parser.addTokens(tokens);
    const ast = parser.complete()!;
    if (!ast) return;
    const result = _evaluate(ast, { grammar, variables });
    return result;
  };

  describe('Grammars', () => {
    it('+', () => {
      const variables = { x: { y: '1' } };
      expect(evaluate('+1')).to.equal(1);
      expect(evaluate('2+1')).to.equal(2 + 1);
      expect(evaluate('+x.y', variables)).to.equal(1);
    });
    it('-', () => {
      const variables = { x: { y: '1' } };
      expect(evaluate('-1', variables)).to.equal(-1);
      expect(evaluate('2-1', variables)).to.equal(1);
      expect(evaluate('-x.y', variables)).to.equal(-1);
    });
    it('%', () => {
      expect(evaluate('4%3')).to.equal(1);
    });
    it('^', () => {
      expect(evaluate('4^3')).to.equal(4 ** 3);
    });
    it('==', () => {
      const variables = { a: null, b: undefined };
      expect(evaluate('4 == 3', variables)).to.equal(false);
      expect(evaluate('4 == "4"', variables)).to.equal(false);
      expect(evaluate('a == a', variables)).to.equal(true);
    });
    it('!=', () => {
      const variables = { a: null, b: undefined };
      expect(evaluate('4 != 3', variables)).to.equal(true);
      expect(evaluate('4 != "4"', variables)).to.equal(true);
      expect(evaluate('a != a', variables)).to.equal(false);
    });
    it('<', () => {
      expect(evaluate('4<3')).to.equal(false);
    });
    it('in', () => {
      const variables = { foo: [1, 2, 3, 4], bar: { x: 4 } };
      expect(evaluate('4 in "1234"', variables)).to.equal(true);
      expect(evaluate('4 in foo', variables)).to.equal(true);
      expect(evaluate('4 in bar', variables)).to.equal(false);
    });
    it('!', () => {
      expect(evaluate('!3')).to.equal(false);
      expect(evaluate('!!0')).to.equal(false);
    });
    it('||', () => {
      expect(evaluate('true||false')).to.equal(true);
      expect(evaluate('""||false')).to.equal(false);
      expect(evaluate('1||false')).to.equal(1);
      expect(evaluate('0||{}')).to.deep.equal({});
    });
    it('??', () => {
      expect(evaluate('null??1')).to.equal(1);
      expect(evaluate('false??1')).to.equal(false);
      expect(evaluate('""??false')).to.equal('');
      expect(evaluate('0??{}')).to.equal(0);
    });
  });
  describe('Literal', () => {
    it('number', () => {
      expect(evaluate('10')).to.equal(10);
      expect(evaluate('10.1')).to.equal(10.1);
      expect(evaluate('-10')).to.equal(-10);
    });
    it('string', () => {
      expect(evaluate('"Hello"')).to.equal('Hello');
      expect(evaluate('"Hello\\""')).to.equal('Hello"');
    });
    it('boolean', () => {
      expect(evaluate('true')).to.equal(true);
      expect(evaluate('false')).to.equal(false);
    });
    it('null', () => {
      expect(evaluate('null')).to.equal(null);
    });
  });
  describe('Unary Expression', () => {
    it('should convert string to number by +', () => {
      const variables = { x: { y: '1' } };
      expect(evaluate('+x.y', variables)).to.equal(1);
    });
    it('should convert string to number by -', () => {
      const variables = { x: { y: '1' } };
      expect(evaluate('-x.y', variables)).to.equal(-1);
    });
    it('should convert boolean to number by !', () => {
      const variables = { x: { y: '1' } };
      expect(evaluate('!!x.y', variables)).to.equal(true);
    });
  });
  describe('Binary Expression', () => {
    it('should evaluate an arithmetic expression', () => {
      expect(evaluate('(2 + 3) * 4')).to.equal(20);
    });
    it('should evaluate right-to-left for ^', () => {
      expect(evaluate('2 ^ 3 ^ 2')).to.equal(2 ** 3 ** 2);
      expect(evaluate('2 ^ 3 ^ 2')).to.equal(2 ** (3 ** 2));
      expect(evaluate('(2 ^ 3) ^ 2')).to.equal((2 ** 3) ** 2);
    });
    it('should handle priority correctly', () => {
      expect(evaluate('3 + 4 * 5')).to.equal(23);
      expect(evaluate('(3 + 4) * 5')).to.equal(35);
      expect(evaluate('4 * 3 ^ 2')).to.equal(36);
      expect(evaluate('4 / 3 / 2')).to.equal(4 / 3 / 2);
    });
    it('should apply the // operator', () => {
      expect(evaluate('7 // 2')).to.equal(3);
    });
    it('should evaluate a string concat', () => {
      expect(evaluate('"Hello" + (4+4) + "Wo\\"rld"')).to.equal('Hello8Wo"rld');
    });
    it('should evaluate a list concat', () => {
      const variables = { a: [1, 2], b: [3, 4] };
      expect(evaluate('a+b', variables)).to.deep.equal([1, 2, 3, 4]);
    });
    it('should evaluate a object concat', () => {
      const variables = { a: { x: 1 }, b: { y: 2 } };
      expect(evaluate('a+b', variables)).to.deep.equal({ x: 1, y: 2 });
    });
    it('should evaluate a true comparison expression', () => {
      expect(evaluate('2 > 1')).to.equal(true);
    });
    it('should evaluate a false comparison expression', () => {
      expect(evaluate('2 <= 1')).to.equal(false);
    });
    it('should evaluate a complex expression', () => {
      expect(evaluate('"foo" && 6 >= 6 && 0 + 1 && true')).to.equal(true);
    });
    it('should apply the "in" operator to strings', () => {
      expect(evaluate('"bar" in "foobartek"')).to.equal(true);
      expect(evaluate('"baz" in "foobartek"')).to.equal(false);
    });
    it('should apply the "in" operator to arrays', () => {
      expect(evaluate('"bar" in ["foo","bar","tek"]')).to.equal(true);
      expect(evaluate('"baz" in ["foo","bar","tek"]')).to.equal(false);
    });
  });
  describe('Ternary Expression', () => {
    it('should evaluate a conditional expression', () => {
      expect(evaluate('"foo" ? 1 : 2')).to.equal(1);
      expect(evaluate('"" ? 1 : 2')).to.equal(2);
    });
    it('should allow missing consequent in ternary', () => {
      expect(evaluate('"foo" ?: "bar"')).to.equal('foo');
    });
  });
  describe('Member Access', () => {
    it('should evaluate an identifier chain', () => {
      const variables = { foo: { baz: { bar: 'tek' } } };
      expect(evaluate('foo.baz.bar', variables)).to.equal(variables.foo.baz.bar);
    });
    it('should make array elements addressable by index', () => {
      const variables = {
        foo: {
          bar: [{ tek: 'tok' }, { tek: 'baz' }, { tek: 'foz' }],
        },
        a: [1, 2, 3],
      };
      expect(evaluate('foo.bar[1].tek', variables)).to.equal('baz');
      expect(evaluate('a[0]', variables)).to.equal(1);
      expect(evaluate('a[-1]', variables)).to.equal(3);
      expect(evaluate('"abc"[-1]', variables)).to.equal('c');
      expect(evaluate('a[1+1]', variables)).to.equal(3);
    });
    it('should allow index object properties', () => {
      const variables = { foo: { baz: { bar: 'tek' } } };
      expect(evaluate('foo["ba" + "z"].bar', variables)).to.equal(variables.foo.baz.bar);
    });
    it('should allow index on string literal', () => {
      expect(evaluate('"abc"[0]')).to.equal('a');
    });
    it('should allow access to literal properties', () => {
      expect(evaluate('"foo".length')).to.equal(3);
    });
  });
  describe('Optional Chain', () => {
    it('optional chain (null)?.bar.baz', () => {
      const variables = {};
      expect(evaluate('foo?.bar.baz', variables)).to.equal(undefined);
    });
    it('optional chain (...)?.bar.baz', () => {
      const variables = { foo: {} };
      expect(() => evaluate('foo?.bar.baz', variables)).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
    it('optional chain (null)?.["bar"].baz', () => {
      const variables = {};
      expect(evaluate('foo?.["bar"].baz', variables)).to.equal(undefined);
    });
    it('optional chain (...)?.["bar"].baz', () => {
      const variables = { foo: {} };
      expect(() => evaluate('foo?.["bar"].baz', variables)).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
    it('optional chain (null)?.().baz', () => {
      const variables = {};
      expect(evaluate('foo?.().baz', variables)).to.equal(undefined);
    });
    it('optional chain (...)?.().baz', () => {
      const variables = { foo: () => undefined };
      expect(() => evaluate('foo?.().baz', variables)).to
        .throw('Cannot read properties of undefined (reading baz)');
    });
    it('optional chain (null)?.bar()', () => {
      const variables = {};
      expect(evaluate('foo?.bar()', variables)).to.equal(undefined);
    });
    it('optional chain (...)?.bar()', () => {
      const variables = { foo: {} };
      expect(() => evaluate('foo?.bar()', variables)).to
        .throw('undefined is not a function');
    });
  });
  describe('Object', () => {
    it('should evaluate an object literal', () => {
      expect(evaluate('{foo: {"bar": "tek"}}')).to.deep.equal({ foo: { bar: 'tek' } });
    });
    it('should evaluate an empty object literal', () => {
      expect(evaluate('{}')).to.deep.equal({});
    });
    it('should evaluate an object with expression key', () => {
      expect(evaluate('{["a"+1]:1}')).to.deep.equal({ a1: 1 });
    });
    it('should evaluate dot notation for object literals', () => {
      expect(evaluate('{foo: "bar"}.foo')).to.equal('bar');
    });
    it('should evaluate object spread', () => {
      expect(evaluate('{...{b:2,c:3}}')).to.deep.equal({ b: 2, c: 3 });
      expect(evaluate('{a:1,...{b:2,c:3}}')).to.deep.equal({ a: 1, b: 2, c: 3 });
      expect(evaluate('{...{b:2,c:3},d:4}')).to.deep.equal({ b: 2, c: 3, d: 4 });
    });
  });
  describe('Array', () => {
    it('should evaluate array literals', () => {
      expect(evaluate('["foo", 1+2]')).to.deep.equal(['foo', 3]);
    });
    it('should allow properties on empty arrays', () => {
      const variables = { foo: {} };
      expect(evaluate('[].baz', variables)).to.equal(undefined);
    });
    it('should evaluate spread array', () => {
      expect(evaluate('[..."123"]')).to.deep.equal(['1', '2', '3']);
      expect(evaluate('[...[1,2,3]]')).to.deep.equal([1, 2, 3]);
      expect(evaluate('[0,..."123"]')).to.deep.equal([0, '1', '2', '3']);
      expect(evaluate('[0,...[1,2,3]]')).to.deep.equal([0, 1, 2, 3]);
      expect(evaluate('[..."123",4]')).to.deep.equal(['1', '2', '3', 4]);
      expect(evaluate('[...[1,2,3],4]')).to.deep.equal([1, 2, 3, 4]);
    });
  });
  describe('Define variables', () => {
    it('def variables', () => {
      expect(evaluate('def a = 1; def b = 2; a + b')).to.deep.equal(3);
    });
    it('def variables computed', () => {
      expect(evaluate('def a = 1; def b = a + 1; def c = a + b; a + b + c')).to.deep.equal(6);
    });
    it('def variables override', () => {
      expect(evaluate('def a = 1; def a = a + 1; def b = 2; a + b')).to.deep.equal(4);
    });
    it('def variables in sub-expression', () => {
      const variables = { x: true, a: 1, b: 2 };
      expect(evaluate('(x ? (def a = 10; a) : b) + a', variables)).to.deep.equal(11);
    });
  });
  describe('Transform', () => {
    it('should apply transforms', () => {
      const variables = { foo: 10 };
      const half = (val: number) => val / 2;
      const transforms = { half };
      expect(evaluate('foo|half + 3', variables, transforms)).to.equal(8);
    });
    it('should apply data function transforms', () => {
      const double = (v: number) => v * 2;
      const half = (v: number) => v / 2;
      const variables = {
        foo: 10,
        double,
        fns: { half },
      };
      expect(evaluate('foo|double + 3', variables)).to.equal(23);
      expect(evaluate('foo|(fns.half) + 3', variables)).to.equal(8);
      expect(evaluate('foo|(fns["half"]) + 3', variables)).to.equal(8);
      expect(evaluate('foo|(fns["ha" + "lf"]) + 3', variables)).to.equal(8);
    });
    it('should apply a transform with multiple args', () => {
      const concat = (val: string, a1: string, a2: string, a3: string) => val + ': ' + a1 + a2 + a3;
      const transforms = { concat };
      expect(evaluate('"foo"|concat("baz", "bar", "tek")', null, transforms))
        .to.equal('foo: bazbartek');
    });
    it('should throw when transform does not exist', () => {
      const variables = {};
      expect(() => evaluate('"hello"|world', variables)).to
        .throw('undefined is not a function');
    });
    it('should filter arrays', () => {
      const variables = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const filter = (arr: any[], fn: (i: any) => any) => arr.filter(fn);
      const transforms = { filter };
      expect(evaluate('foo.bar|filter(@.tek == "baz")', variables, transforms))
        .to.deep.equal([{ tek: 'baz' }]);
      expect(evaluate('foo.bar|filter(fn (a) => a.tek == "baz")', variables, transforms))
        .to.deep.equal([{ tek: 'baz' }]);
    });
    it('should map arrays', () => {
      const variables = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const map = (arr: any[], fn: (i: any) => any) => arr.map(fn);
      const transforms = { map };
      expect(evaluate('foo.bar|map({tek: "1"+(@.tek||@.tok)})', variables, transforms))
        .to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
      expect(evaluate('foo.bar|map(fn(a) => {tek: "1"+(a.tek||a.tok)})', variables, transforms))
        .to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
    });
    it('should reduce arrays', () => {
      const variables = {
        foo: {
          bar: [{ x: 1 }, { x: 2 }, { x: 3 }],
        },
      };
      const sum = <T>(arr: T[], by: (i: T) => number) => arr.reduce((n, i) => n + (by(i) || 0), 0);
      const transforms = { sum };
      expect(evaluate('-(foo.bar|sum(@.x))', variables, transforms)).to.equal(-6);
      expect(evaluate('-(foo.bar|sum(fn(a)=>a.x))', variables, transforms)).to.equal(-6);
    });
  });
  describe('Function Call', () => {
    it('should throw when function does not exist', () => {
      const variables = {};
      expect(() => evaluate('world()', variables)).to
        .throw('undefined is not a function');
    });
    it('should apply function of transforms', () => {
      const variables = { foo: 10 };
      const half = (val: number) => val / 2;
      const transforms = { half };
      expect(evaluate('half(foo) + 3', variables, transforms)).to.equal(8);
    });
    it('should apply function of variables', () => {
      const double = (v: number) => v * 2;
      const half = (v: number) => v / 2;
      const variables = {
        foo: 10,
        double,
        fns: { half },
      };
      expect(evaluate('double(foo) + 3', variables)).to.equal(23);
      expect(evaluate('fns.half(foo) + 3', variables)).to.equal(8);
      expect(evaluate('fns["half"](foo) + 3', variables)).to.equal(8);
      expect(evaluate('fns["ha" + "lf"](foo) + 3', variables)).to.equal(8);
    });
    it('should apply with multiple args', () => {
      const concat = (val: string, a1: string, a2: string, a3: string) => val + ': ' + a1 + a2 + a3;
      const transforms = { concat };
      expect(evaluate('concat("foo", "baz", "bar", "tek")', null, transforms))
        .to.equal('foo: bazbartek');
    });
    it('should throw when does not exist', () => {
      const variables = {};
      expect(() => evaluate('world("hello")', variables)).to
        .throw('undefined is not a function');
    });
    it('should filter arrays', () => {
      const variables = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const filter = (arr: any[], fn: (i: any) => any) => arr.filter(fn);
      const transforms = { filter };
      expect(evaluate('filter(foo.bar,@.tek == "baz")', variables, transforms))
        .to.deep.equal([{ tek: 'baz' }]);
      expect(evaluate('filter(foo.bar,fn(a)=>a.tek == "baz")', variables, transforms))
        .to.deep.equal([{ tek: 'baz' }]);
    });
    it('should map arrays', () => {
      const variables = {
        foo: {
          bar: [{ tek: 'hello' }, { tek: 'baz' }, { tok: 'baz' }],
        },
      };
      const map = (arr: any[], fn: (i: any) => any) => arr.map(fn);
      const transforms = { map };
      expect(evaluate('map(foo.bar,{tek: "1"+(@.tek||@.tok)})', variables, transforms))
        .to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
      expect(evaluate('map(foo.bar,fn(a)=>{tek: "1"+(a.tek||a.tok)})', variables, transforms))
        .to.deep.equal([{ tek: '1hello' }, { tek: '1baz' }, { tek: '1baz' }]);
    });
    it('should reduce arrays', () => {
      const variables = {
        foo: {
          bar: [{ x: 1 }, { x: 2 }, { x: 3 }],
        },
      };
      const sum = <T>(arr: T[], by: (i: T) => number) => arr.reduce((n, i) => n + (by(i) || 0), 0);
      const transforms = { sum };
      expect(evaluate('-(sum(foo.bar,@.x))', variables, transforms)).to.equal(-6);
      expect(evaluate('-(sum(foo.bar,fn(a)=>a.x))', variables, transforms)).to.equal(-6);
    });
  });
  describe('Function', () => {
    it('should apply function transforms', () => {
      const variables = { foo: 10 };
      expect(evaluate('foo|(fn (v) => v > 10)?"large":"small"', variables)).to.equal('small');
    });
    it('should apply complex function transforms', () => {
      const variables = { foo: 10 };
      expect(evaluate('(foo+3+5)|(fn (v) => {x:v/2,y:v/2+3})', variables)).to.deep.equal({ x: 9, y: 12 });
    });
    it('should define function with args', () => {
      expect(evaluate('def add = fn (a, b) => a+b;add(1,2)')).to.equal(3);
    });
    it('def with no args', () => {
      expect(evaluate('def get = fn () => 10;get()')).to.equal(10);
    });
  });
  describe('Lambda', () => {
    it('should apply lambda transforms', () => {
      const variables = { foo: 10 };
      expect(evaluate('foo|(@>10)?"large":"small"', variables)).to.equal('small');
      expect(evaluate('foo|(fn(a)=>a>10)?"large":"small"', variables)).to.equal('small');
    });
    it('should apply complex lambda transforms', () => {
      const variables = { foo: 10 };
      expect(evaluate('(foo+3+5)|({x:@/2,y:@/2+3})', variables)).to.deep.equal({ x: 9, y: 12 });
      expect(evaluate('(foo+3+5)|(fn(a)=>{x:a/2,y:a/2+3})', variables)).to.deep.equal({ x: 9, y: 12 });
    });
    it('should define lambda with args', () => {
      expect(evaluate('def isLarge = @>@1;isLarge(1+2+3,4+5+6)?"great":"small"')).to.equal('small');
      expect(evaluate('def isLarge = fn(a,b)=>a>b;isLarge(1+2+3,4+5+6)?"great":"small"')).to.equal('small');
    });
  });
  describe('Whitespaces', () => {
    it('should handle an expression with arbitrary whitespace', () => {
      expect(evaluate('(\t2\n+\n3) *\n4\n\r\n')).to.equal(20);
    });
  });
});
