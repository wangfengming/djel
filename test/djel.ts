import { expect } from 'chai';
import Djel from '../src';

describe('Djel', () => {
  let djel: ReturnType<typeof Djel>;
  beforeEach(() => {
    djel = Djel();
  });

  it('should evaluate', () => {
    expect(djel.evaluate('2+2')).to.equal(4);
  });
  it('should throw', () => {
    expect(() => djel.evaluate('2**2')).to.throw();
  });
  it('should pass context', () => {
    expect(djel.evaluate('foo', { foo: 'bar' })).to.equal('bar');
  });
  it('should allow transforms to be defined', () => {
    djel.addTransforms({
      toCase: (val: string, args: { case: 'upper' | 'lower' }) => {
        if (args.case === 'upper') return val.toUpperCase();
        return val.toLowerCase();
      },
    });
    expect(djel.evaluate('"hello"|toCase({case:"upper"})')).to.equal('HELLO');
  });
  it('should allow transforms to be set in batch', () => {
    const context = {
      users: [
        { age: 18, name: 'Nikolai Jakov' },
        { age: 17, name: 'Len Trexler' },
        { age: 19, name: 'Burt Reynolds' },
      ],
    };
    djel.addTransforms({
      filter: (arr: any[], by: (value: any) => any) => arr.filter(by),
      map: (arr: any[], by: (value: any) => any) => arr.map(by),
      sum: (arr: any[], by: (value: any) => number) => arr.reduce((s, i) => s + (by(i) || 0), 0),
    });
    expect(djel.evaluate('users|filter(@.age<18)', context)).to.deep.equal([{ age: 17, name: 'Len Trexler' }]);
    expect(djel.evaluate('users|map(@.age)', context)).to.deep.equal([18, 17, 19]);
    expect(djel.evaluate('users|sum(@.age)/users.length', context)).to.equal(18);
  });
  it('should allow transforms to be removed', () => {
    djel.addTransforms({
      add1: (v: number) => v + 1,
    });
    expect(djel.evaluate('2|add1')).to.equal(3);
    djel.removeTransform('add1');
    expect(() => djel.evaluate('2|add1')).to.throw();
  });
  it('should allow binaryOps to be defined', () => {
    djel.addBinaryOps({
      '_=': {
        priority: 20,
        fn: (left: string, right: string) => left.toLowerCase() === right.toLowerCase(),
      },
    });
    expect(djel.evaluate('"FoO" _= "fOo"')).to.equal(true);
  });
  it('should observe weight on binaryOps', () => {
    djel.addBinaryOps({
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
      djel.evaluate('1 + 2 ** 3 + 4'),
      djel.evaluate('1 + 2 *** 3 + 4'),
    ]).to.deep.equal([20, 15]);
  });
  it('should allow unaryOps to be defined', () => {
    djel.addUnaryOps({
      '~': {
        priority: 10000,
        fn: (right: number) => Math.floor(right),
      },
    });
    expect(djel.evaluate('~5.7 + 5')).to.equal(10);
  });
  it('should allow binaryOps to be removed', () => {
    djel.removeOp('+');
    expect(() => djel.evaluate('1+2')).to.throw();
  });
  it('should allow unaryOps to be removed', () => {
    djel.removeOp('!');
    expect(() => djel.evaluate('!true')).to.throw();
  });
  it('should allow compile result to be reused', () => {
    const expr = djel.compile('{x: y, y: x}');
    expect(expr.evaluate({ x: 1, y: 2 })).to.deep.equal({ x: 2, y: 1 });
    expect(expr.evaluate({ x: 3, y: 4 })).to.deep.equal({ x: 4, y: 3 });
  });
});
