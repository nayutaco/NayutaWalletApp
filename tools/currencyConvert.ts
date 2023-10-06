import {convertFiatToCrypto} from './btctools';

import {canParseFloat} from 'tools';
import {CurrencyUnit} from 'types/currency';
import Satoshi from 'types/Satoshi';

/**
 * Converts the given value to Satoshi in units of srcUnit.
 * @param srcUnit
 * @param value
 * @returns {Promise<Satoshi>}
 */
export async function convertToSatoshiFromUnit(srcUnit: CurrencyUnit, value: string): Promise<Satoshi | undefined> {
  try {
    if (srcUnit === 'sat') {
      return Satoshi.fromSat(value);
    } else if (srcUnit === 'btc') {
      return Satoshi.fromBTC(value);
    } else {
      if (!canParseFloat(value, false)) {
        return;
      }
      return await convertFiatToCrypto(parseFloat(value), srcUnit, 'btc').then(fiatToBtc => {
        return Satoshi.fromBTC(fiatToBtc);
      });
    }
  } catch (e) {
    // do nothing if error
  }
}
