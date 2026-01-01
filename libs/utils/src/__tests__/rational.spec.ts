import {expect, describe, test} from 'vitest'
import {Rational,RationalString} from '../rational';


type RationalParams = [num:number, den:number];
type Case = [rp:RationalParams, expected:RationalString];

describe('Rational', () => {
  test('constructor normalization', () => {
    const cases:Case[] = [
    [[1,1], '1'], [[19,19], '1'], [[197,197], '1'], [[100,100], '1'],
    [[2,3], '2/3'], [[4,6], '2/3'], [[6,9], '2/3'], [[200,300], '2/3'],

    [[1,2], '1/2'], [[2,4], '1/2'], [[3,6], '1/2'], [[5,10], '1/2'], [[100,200], '1/2'],
    [[-1,2], '-1/2'], [[-10,20], '-1/2'],
    [[1,-2], '-1/2'], [[10,-20], '-1/2'],
    [[-1,-2], '1/2'],
    [[-1,1], '-1'], [[1,-1], '-1'], [[-1,-1], '1'],
    [[0,1], '0'], [[0,2], '0'], [[0,-1], '0'], [[0,-2], '0'],
    [[-0,1], '0'], [[-0,2], '0'], [[-0,-1], '0'], [[-0,-2], '0'],
    ];

    cases.forEach(([[num, den], expected]) => {
      const r = new Rational(num, den);
      const n =`${num}`.padStart(6, ' ');
      const d =`${den}`.padEnd  (6, ' ');
      const rps = `${n}/${d}`;

      expect(r.toString()).toBe(expected);
    })

  });
});

function assertRational(
  actual: Rational,
  expectedNumerator: number,
  expectedDenominator: number
): void {
  expect(actual.numerator).toEqual(expectedNumerator);
  expect(actual.denominator).toEqual(expectedDenominator);
}
describe('Addition', () => {
  test('Add two positive rational numbers', () => {
    const actual = new Rational(1, 2).add(new Rational(2, 3))
    assertRational(actual, 7, 6)
  })
  test('Add a positive rational number and a negative rational number', () => {
    const actual = new Rational(1, 2).add(new Rational(-2, 3))
    assertRational(actual, -1, 6)
  })
  test('Add two negative rational numbers', () => {
    const actual = new Rational(-1, 2).add(new Rational(-2, 3))
    assertRational(actual, -7, 6)
  })
  test('Add a rational number to its additive inverse', () => {
    const actual = new Rational(1, 2).add(new Rational(-1, 2))
    assertRational(actual, 0, 1)
  })
})
describe('Subtraction', () => {
  test('Subtract two positive rational numbers', () => {
    const actual = new Rational(1, 2).sub(new Rational(2, 3))
    assertRational(actual, -1, 6)
  })
  test('Subtract a positive rational number and a negative rational number', () => {
    const actual = new Rational(1, 2).sub(new Rational(-2, 3))
    assertRational(actual, 7, 6)
  })
  test('Subtract two negative rational numbers', () => {
    const actual = new Rational(-1, 2).sub(new Rational(-2, 3))
    assertRational(actual, 1, 6)
  })
  test('Subtract a rational number from itself', () => {
    const actual = new Rational(1, 2).sub(new Rational(1, 2))
    assertRational(actual, 0, 1)
  })
})
describe('Multiplication', () => {
  test('Multiply two positive rational numbers', () => {
    const actual = new Rational(1, 2).mul(new Rational(2, 3))
    assertRational(actual, 1, 3)
  })
  test('Multiply a negative rational number by a positive rational number', () => {
    const actual = new Rational(-1, 2).mul(new Rational(2, 3))
    assertRational(actual, -1, 3)
  })
  test('Multiply two negative rational numbers', () => {
    const actual = new Rational(-1, 2).mul(new Rational(-2, 3))
    assertRational(actual, 1, 3)
  })
  test('Multiply a rational number by its reciprocal', () => {
    const actual = new Rational(1, 2).mul(new Rational(2, 1))
    assertRational(actual, 1, 1)
  })
  test('Multiply a rational number by 1', () => {
    const actual = new Rational(1, 2).mul(new Rational(1, 1))
    assertRational(actual, 1, 2)
  })
  test('Multiply a rational number by 0', () => {
    const actual = new Rational(1, 2).mul(new Rational(0, 1))
    assertRational(actual, 0, 1)
  })
})

describe('Division', () => {
  test('Divide two positive rational numbers', () => {
    const actual = new Rational(1, 2).div(new Rational(2, 3))
    assertRational(actual, 3, 4)
  })
  test('Divide a positive rational number by a negative rational number', () => {
    const actual = new Rational(1, 2).div(new Rational(-2, 3))
    assertRational(actual, -3, 4)
  })
  test('Divide two negative rational numbers', () => {
    const actual = new Rational(-1, 2).div(new Rational(-2, 3))
    assertRational(actual, 3, 4)
  })
  test('Divide a rational number by 1', () => {
    const actual = new Rational(1, 2).div(new Rational(1, 1))
    assertRational(actual, 1, 2)
  })
})
describe('Absolute value', () => {
  test('Absolute value of a positive rational number', () => {
    const actual = new Rational(1, 2).abs()
    assertRational(actual, 1, 2)
  })
  test('Absolute value of a positive rational number with negative numerator and denominator', () => {
    const actual = new Rational(-1, -2).abs()
    assertRational(actual, 1, 2)
  })
  test('Absolute value of a negative rational number', () => {
    const actual = new Rational(-1, 2).abs()
    assertRational(actual, 1, 2)
  })
  test('Absolute value of a negative rational number with negative denominator', () => {
    const actual = new Rational(1, -2).abs()
    assertRational(actual, 1, 2)
  })
  test('Absolute value of zero', () => {
    const actual = new Rational(0, 1).abs()
    assertRational(actual, 0, 1)
  })
  test('Absolute value of a rational number is reduced to lowest terms', () => {
    const actual = new Rational(2, 4).abs()
    assertRational(actual, 1, 2)
  })
})
describe('Exponentiation of a rational number', () => {
  test('Raise a positive rational number to a positive integer power', () => {
    const actual = new Rational(1, 2).exprational(3)
    assertRational(actual, 1, 8)
  })
  test('Raise a negative rational number to a positive integer power', () => {
    const actual = new Rational(-1, 2).exprational(3)
    assertRational(actual, -1, 8)
  })
  test('Raise a positive rational number to a negative integer power', () => {
    const actual = new Rational(3, 5).exprational(-2)
    assertRational(actual, 25, 9)
  })
  test('Raise a negative rational number to an even negative integer power', () => {
    const actual = new Rational(-3, 5).exprational(-2)
    assertRational(actual, 25, 9)
  })
  test('Raise a negative rational number to an odd negative integer power', () => {
    const actual = new Rational(-3, 5).exprational(-3)
    assertRational(actual, -125, 27)
  })
  test('Raise zero to an integer power', () => {
    const actual = new Rational(0, 1).exprational(5)
    assertRational(actual, 0, 1)
  })
  test('Raise one to an integer power', () => {
    const actual = new Rational(1, 1).exprational(4)
    assertRational(actual, 1, 1)
  })
  test('Raise a positive rational number to the power of zero', () => {
    const actual = new Rational(1, 2).exprational(0)
    assertRational(actual, 1, 1)
  })
  test('Raise a negative rational number to the power of zero', () => {
    const actual = new Rational(-1, 2).exprational(0)
    assertRational(actual, 1, 1)
  })
})
describe('Exponentiation of a real number to a rational number', () => {
  test('Raise a real number to a positive rational number', () => {
    const actual = new Rational(4, 3).expreal(8)
    expect(actual).toBeCloseTo(16.0, 10)
  })
  test('Raise a real number to a negative rational number', () => {
    const actual = new Rational(-1, 2).expreal(9)
    expect(actual).toBeCloseTo(1.0 / 3.0, 10)
  })
  test('Raise a real number to a zero rational number', () => {
    const actual = new Rational(0, 1).expreal(2)
    expect(actual).toBeCloseTo(1.0, 10)
  })
})
describe('Reduction to lowest terms', () => {
  test('Reduce a positive rational number to lowest terms', () => {
    const actual = new Rational(2, 4).reduce()
    assertRational(actual, 1, 2)
  })
  test('Reduce places the minus sign on the numerator', () => {
    const actual = new Rational(3, -4).reduce()
    assertRational(actual, -3, 4)
  })
  test('Reduce a negative rational number to lowest terms', () => {
    const actual = new Rational(-4, 6).reduce()
    assertRational(actual, -2, 3)
  })
  test('Reduce a rational number with a negative denominator to lowest terms', () => {
    const actual = new Rational(3, -9).reduce()
    assertRational(actual, -1, 3)
  })
  test('Reduce zero to lowest terms', () => {
    const actual = new Rational(0, 6).reduce()
    assertRational(actual, 0, 1)
  })
  test('Reduce an integer to lowest terms', () => {
    const actual = new Rational(-14, 7).reduce()
    assertRational(actual, -2, 1)
  })
  test('Reduce one to lowest terms', () => {
    const actual = new Rational(13, 13).reduce()
    assertRational(actual, 1, 1)
  })
})
