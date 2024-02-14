import {BigNumber} from 'bignumber.js';
BigNumber.config({
  EXPONENTIAL_AT: [-12, 20],
  FORMAT: {
    prefix: '',
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: '',
    fractionGroupSize: 0,
    suffix: '',
  },
});
type Input = string | number | BigNumber;

export const isInput = (arg: unknown): arg is Input => {
  return typeof arg === 'string' || typeof arg === 'number' || arg instanceof BigNumber;
};
class Satoshi {
  /**
   * value in satoshis, can have msat accuracy with decimal point.
   * Note: value can have negative value. (tried to express debt?)
   */
  private value: BigNumber;

  constructor(satBN: BigNumber) {
    if (satBN.isNaN()) {
      throw new Error('Satoshi value must be a number');
    }
    if (!satBN.isInteger()) {
      satBN = satBN.shiftedBy(3).integerValue(BigNumber.ROUND_FLOOR).shiftedBy(-3);
    }
    this.value = satBN;
  }
  /**
   * Instantiate a Satoshi from value in satoshis.
   *
   * @param satoshis - value in satoshis, accepts msat accuracy value. Accuracy less than 1msat is rounded down.
   */
  public static fromSat(sat: Input): Satoshi {
    return new Satoshi(new BigNumber(sat));
  }
  /**
   * Instantiates a Satoshi from value in milli-satoshis.
   *
   * @param satoshis - value in milli-satoshis, accepts integer-like value. float is rounded down.
   */
  public static fromMilliSat(msat: Input): Satoshi {
    const sat = new BigNumber(msat).shiftedBy(-3);
    return new Satoshi(sat);
  }
  /**
   * Instantiate a Satoshi from value in BTC.
   *
   * @param btc - value in BTC, accepts msat accuracy value. Accuracy less than 1msat is rounded down.
   */
  public static fromBTC(btc: Input): Satoshi {
    const sat = new BigNumber(btc).shiftedBy(8);
    return new Satoshi(sat);
  }
  /**
   * this + sat = new satoshi instance
   * Note: In theory, dimension of the value is not changed when adding the two same unit value.
   * @param satoshi - a Satoshi instance
   * @return - a new Satoshi instance
   */
  public add(sat: Satoshi): Satoshi {
    return new Satoshi(this.value.plus(sat.value));
  }
  /**
   * this - sat = new satoshi instance
   * Note: This can cause a negative value.
   * Note: In theory, dimension of the value is not changed when adding the two same unit value.
   * @param satoshi - a Satoshi instance
   * @return - a new Satoshi instance
   */
  public sub(sat: Satoshi): Satoshi {
    return new Satoshi(this.value.minus(sat.value));
  }
  /**
   * this * n = new satoshi instance
   * Note: n must be dimensionless, or coefficient, don't be dimentional value
   *       (e.g. n = 3.5 is ok, but n = 3.5BTC or n = 3.5 meters is not ok)
   *       Otherwise, it will break a dimension, which is mathematically illegal.
   * @param n - dimensionless value
   * @return - a new Satoshi instance
   */
  public mul(n: Input): Satoshi {
    return new Satoshi(this.value.times(n));
  }
  /**
   * this / n = new satoshi instance
   * Note: n must be dimensionless, or coefficient, don't be dimentional value
   *       (e.g. n = 3.5 is ok, but n = 3.5BTC or n = 3.5 meters is not ok)
   *       Otherwise, it will break a dimension, which is mathematically illegal.
   * Note: Division is not always safe. It is not recommended to use it.
   *       `/` operator in ECMAScript is also unsafe, but faster than it.
   * @param n - dimensionless value
   * @return - a new Satoshi instance
   */
  public div(n: Input): Satoshi {
    return new Satoshi(this.value.div(n));
  }
  public static addAll(sats: Satoshi[]): Satoshi {
    return sats.reduce((acc, cur) => acc.add(cur));
  }
  /**
   * Converts to string.
   * It must be loss-less conversion.
   */
  public toString(): string {
    return this.value.toString();
  }
  /**
   * Converts to number
   * Note: This conversion is lossy. Appropriate to use for lossy arithmetical conversion such as crypto-fiat exchange.
   */
  public toNumber(): number {
    return this.value.toNumber();
  }
  public toMsat(): BigNumber {
    return this.value.shiftedBy(3);
  }
  public toBTC(): BigNumber {
    return this.value.shiftedBy(-8);
  }
  /**
   * Converts to a human readable format.
   * Note: Do not reconvert with Satoshi.fromSat. This string conversion is lossy.
   */
  public toFormat(): string {
    return this.value.toFormat();
  }
  /**
   * Converts to a human readable format without group separator.
   */
  public toFormatWithoutGroup(): string {
    return this.value.toFormat({groupSeparator: ''});
  }
  /**
   * Return true if the value has accuracy less than 1 satoshi.
   */
  public hasMsat(): boolean {
    return !this.value.isInteger();
  }
  /**
   * Rounds down accuracy of less than 1 satoshi.
   */
  public floorMsat(): Satoshi {
    return new Satoshi(this.value.integerValue(BigNumber.ROUND_FLOOR));
  }

  static max(...sats: Satoshi[]): Satoshi {
    return new Satoshi(BigNumber.max(...sats.map(sat => sat.value)));
  }
}
export default Satoshi;
// TODO: テストけーす
