import { expect } from 'chai';
import Del from '../src/del';

describe('Del', () => {
  let del: ReturnType<typeof Del>;
  beforeEach(() => {
    del = Del();
  });

  it('should evaluate', () => {
    expect(del.evaluate('2+2')).to.equal(4);
  });
  it('should throw', () => {
    expect(() => del.evaluate('2**2')).to.throw();
  });
  it('should allow transforms to be defined', () => {
    del.addTransforms({
      toCase: (val: string, args: { case: 'upper' | 'lower' }) => {
        if (args.case === 'upper') return val.toUpperCase();
        return val.toLowerCase();
      },
    });
    expect(del.evaluate('"hello"|toCase({case:"upper"})')).to.equal('HELLO');
  });
  it('should allow transforms to be set in batch', () => {
    del.addTransforms({
      add1: (v: number) => v + 1,
      add2: (v: number) => v + 2,
    });
    expect(del.evaluate('2|add1|add2')).to.equal(5);
  });
  it('should allow transforms to be removed', () => {
    del.addTransforms({
      add1: (v: number) => v + 1,
    });
    expect(del.evaluate('2|add1')).to.equal(3);
    del.removeTransform('add1');
    expect(() => del.evaluate('2|add1')).to.throw();
  });
  it('should pass context', () => {
    expect(del.evaluate('foo', { foo: 'bar' })).to.equal('bar');
  });
  it('should allow binaryOps to be defined', () => {
    del.addBinaryOps({
      '_=': {
        priority: 20,
        fn: (left: string, right: string) => left.toLowerCase() === right.toLowerCase(),
      },
    });
    expect(del.evaluate('"FoO" _= "fOo"')).to.equal(true);
  });
  it('should observe weight on binaryOps', () => {
    del.addBinaryOps({
      '**': {
        priority: 0,
        fn: (left, right) => left * 2 + right * 2,
      },
      '***': {
        priority: 1000,
        fn: (left, right) => left * 2 + right * 2,
      },
    });
    expect([
      del.evaluate('1 + 2 ** 3 + 4'),
      del.evaluate('1 + 2 *** 3 + 4'),
    ]).to.deep.equal([20, 15]);
  });
  it('should allow unaryOps to be defined', () => {
    del.addUnaryOps({
      '~': {
        priority: 10000,
        fn: (right: number) => Math.floor(right),
      },
    });
    expect(del.evaluate('~5.7 + 5')).to.equal(10);
  });
  it('should allow binaryOps to be removed', () => {
    del.removeOp('+');
    expect(() => del.evaluate('1+2')).to.throw();
  });
  it('should allow unaryOps to be removed', () => {
    del.removeOp('!');
    expect(() => del.evaluate('!true')).to.throw();
  });
  it('should allow compile result to be reused', () => {
    const expr = del.compile('{x: y, y: x}');
    expect(expr.evaluate({ x: 1, y: 2 })).to.deep.equal({ x: 2, y: 1 });
    expect(expr.evaluate({ x: 3, y: 4 })).to.deep.equal({ x: 4, y: 3 });
  });

  describe('Grammars', () => {
    it('+', () => {
      expect(del.evaluate('+1')).to.equal(1);
      expect(del.evaluate('2+1')).to.equal(2 + 1);
      expect(del.evaluate('+x.y', { x: { y: '1' } })).to.equal(1);
    });
    it('-', () => {
      expect(del.evaluate('-1')).to.equal(-1);
      expect(del.evaluate('2-1')).to.equal(2 - 1);
      expect(del.evaluate('-x.y', { x: { y: 1 } })).to.equal(-1);
    });
    it('%', () => {
      expect(del.evaluate('4%3')).to.equal(4 % 3);
    });
    it('^', () => {
      expect(del.evaluate('4^3')).to.equal(Math.pow(4, 3));
    });
    it('!=', () => {
      expect(del.evaluate('4!=3')).to.equal(true);
    });
    it('<', () => {
      expect(del.evaluate('4<3')).to.equal(false);
    });
    it('in', () => {
      expect(del.evaluate('4 in "1234"')).to.equal(true);
      expect(del.evaluate('4 in [1,2,3,4]')).to.equal(true);
      expect(del.evaluate('4 in {x:4}')).to.equal(false);
    });
    it('!', () => {
      expect(del.evaluate('!3')).to.equal(false);
    });
    it('priority', () => {
      expect(del.evaluate('3 + 4 * 5')).to.equal(23);
      expect(del.evaluate('(3 + 4) * 5')).to.equal(35);
      expect(del.evaluate('4 * 3 ^ 2')).to.equal(36);
      expect(del.evaluate('4 / 3 / 2')).to.equal(4 / 3 / 2);
    });
  });
});
