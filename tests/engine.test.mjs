import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, formatNumber, toggleSign, appendInput } from '../dist/engine.js';

test('arithmetic respects precedence, grouped values and signed operands', () => {
  for (const [expression, expected] of [
    ['2+3*4',14], ['(2+3)*4',20], ['12/4-5',-2], ['-3*-4',12],
    ['2--3',5], ['-(2+3)',-5], ['0.1+0.2',0.3], ['12,5+0,5',13],
    ['200*15%',30], ['50%',0.5], ['2*(3+4)',14], ['1e-7*2',2e-7],
    ['π*2',6.28318530718], ['2×3−1',5], ['8÷2',4],
  ]) assert.equal(evaluate(expression), expected, expression);
});

test('invalid input and non-finite arithmetic produce recoverable errors', () => {
  for (const expression of ['1/0','0/0','2+','(2+3','2..3','alert(1)','2**3','','1e999']) {
    assert.throws(() => evaluate(expression), Error, expression);
  }
});

test('formatting keeps a readable decimal and does not expose float artifacts', () => {
  assert.equal(formatNumber(0.1+0.2), '0,3');
  assert.equal(formatNumber(12345.67), '12\u202f345,67');
  assert.equal(formatNumber(-0), '0');
  assert.match(formatNumber(1e20), /e\+20/);
  assert.equal(formatNumber(1234567890123), '1,23456789012e+12');
});

test('decimal and digit entry after grouped values uses implicit multiplication', () => {
  assert.equal(appendInput('π', ','), 'π×0,');
  assert.equal(evaluate(appendInput(appendInput('π', ','), '5')), 1.57079632679);
  assert.equal(evaluate(appendInput(appendInput('(2+3)', ','), '5')), 2.5);
  assert.equal(evaluate(appendInput('50%', '2')), 1);
  assert.equal(appendInput('1,2', ','), '1,2');
  assert.equal(appendInput('2+', '×'), '2×');
});

test('sign changes the last operand and changes it back on a second press', () => {
  for (const [expression, negativeResult, restoredResult] of [
    ['2+3',-1,5], ['2−3',5,-1], ['2×(3+4)',-14,14],
    ['-3',3,-3], ['1e-7',-1e-7,1e-7], ['200×15%',-30,30], ['π',-3.14159265359,3.14159265359],
  ]) {
    const changed = toggleSign(expression);
    assert.equal(evaluate(changed), negativeResult, expression);
    assert.equal(evaluate(toggleSign(changed)), restoredResult, expression);
  }
});
