/**
 * These functions are used to convert Satoshi to a currency string, vice versa.
 * Crypto-to-crypto conversion must be guaranteed to be bijective.
 */
import {BigNumber} from 'bignumber.js';
import {useLayoutEffect, useState} from 'react';

import {convertCryptoToFiat} from 'tools/btctools';
import {CurrencyUnit} from 'types/currency';
import Satoshi from 'types/Satoshi';

/**
 * Converts a number of satoshis to a amount string in currency destUnit.
 */
export function useSatToCurrency(destUnit: CurrencyUnit, value: Satoshi | string | null | undefined, formatted = false): string | null {
  const [amountValue, setAmountValue] = useState(() => {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      value = Satoshi.fromBTC(value);
    }
    if (destUnit === 'sat') {
      return value.toString();
    } else if (destUnit === 'btc') {
      return value.toBTC().toString();
    }
    return null;
  });
  useLayoutEffect(() => {
    let isUnmounted = false;
    if (!value) {
      setAmountValue(null);
      return;
    }
    let resolvedValue: Satoshi;
    if (typeof value === 'string') {
      resolvedValue = Satoshi.fromSat(value);
    } else {
      resolvedValue = value as Satoshi;
    }
    if (destUnit === 'sat') {
      setAmountValue(formatted ? resolvedValue.toFormat() : resolvedValue.toString());
    } else if (destUnit === 'btc') {
      setAmountValue(formatted ? resolvedValue.toBTC().toFormat() : resolvedValue.toBTC().toString());
    } else {
      convertCryptoToFiat(resolvedValue.toBTC().toNumber(), 'btc', destUnit)
        .then(satToFiat => {
          if (isUnmounted) return;
          setAmountValue(new BigNumber(satToFiat).toFormat(2));
        })
        .catch(() => {
          // do nothing if error, remains null
        });
    }
    return () => {
      isUnmounted = true;
    };
  }, [destUnit, value, formatted]);
  return amountValue;
}
