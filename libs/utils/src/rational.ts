
const gcd     = (a: number, b: number): number => b === 0? Math.abs(a): gcd(b, a % b);  // greatest common divisor
const nthroot = (v: number, n: number): number => Math.pow(v, 1 / n);


export type RationalString =`${number}/${number}`|`${number}`;
export class Rational {
  public readonly numerator:number;
  public readonly denominator:number;

  constructor( num:number, den:number) {
   const n = num;
   const d = den;
    const absNum = Math.abs(num);
    const absDen = Math.abs(den);
    const gcdv = gcd(absNum, absDen);
    if(gcdv > 1) {
      num = num/gcdv;
      den = den/gcdv;
    }
    if(den < 0) {
      num = -num;
      den = -den;
    }
    this.numerator = num;
    this.denominator = den;
    console.log(`constructed ${this.toString()} from (${n}/${d}) with gcdv = ${gcdv}`);
  }


  add(b: Rational): Rational {
    return new Rational(this.numerator * b.denominator + this.denominator * b.numerator, this.denominator * b.denominator);
  }

  sub(b: Rational): Rational {
    return new Rational(this.numerator * b.denominator - this.denominator * b.numerator, this.denominator * b.denominator);
  }

  mul(b: Rational):Rational {
    return new Rational(this.numerator * b.numerator, this.denominator * b.denominator);
  }

  div(b: Rational):Rational {
    return new Rational(this.numerator * b.denominator, this.denominator * b.numerator);
  }

  abs(): Rational {
    return new Rational(Math.abs(this.numerator), Math.abs(this.denominator));
  }

  expreal(x: number): number {
    //    Exponentiation of a real number x to a rational number
    //    r = a/b is x^(a/b) = root(x^a, b), where root(p, q) is the qth root of p.
    return nthroot(Math.pow(x, this.numerator), this.denominator);
  }


  // despite unintuitive name, this raises itself to an integer
  exprational(n: number): Rational {
    if(n < 0)
      return new Rational(Math.pow(this.denominator, -n), Math.pow(this.numerator, -n));
    return   new Rational(Math.pow(this.numerator, n), Math.pow(this.denominator, n));
  }

  reduce(): Rational {
    return this;
  }

  toString(): RationalString
  {
    return this.numerator === 0 ? '0' : this.denominator === 1 ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }

  valueOf(): number
  {
    return this.numerator? this.numerator / this.denominator: 0;
  }

}
