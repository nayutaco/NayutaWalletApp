import {BigNumber} from 'bignumber.js';
import i18next from 'i18next';
import {Platform} from 'react-native';

import {getCachedLang} from 'store/storeContext';
import {DigitRule} from 'types';

const FORMAT1 = {
  prefix: '',
  decimalSeparator: '.', // dot
  groupSeparator: ',', // comma
  groupSize: 3,
  secondaryGroupSize: 0,
  fractionGroupSeparator: '',
  fractionGroupSize: 0,
  suffix: '',
};
const FORMAT2 = {
  prefix: '',
  decimalSeparator: ',', // comma
  groupSeparator: '.', // dot
  groupSize: 3,
  secondaryGroupSize: 0,
  fractionGroupSeparator: '',
  fractionGroupSize: 0,
  suffix: '',
};

export function setLocale(locale: string, digitRule: DigitRule) {
  i18next.changeLanguage(locale);
  let fmt;
  if (digitRule === 'european') {
    fmt = FORMAT2;
  } else {
    fmt = FORMAT1;
  }
  BigNumber.config({
    EXPONENTIAL_AT: [-12, 20],
    FORMAT: fmt,
  });
}

export function convertNumberString(numStr: string, digitRule: DigitRule): string {
  if (digitRule === 'european') {
    if (numStr.indexOf('.') !== -1) {
      // if including "."( = digit divider)
      const removedDigit = numStr.replace(/\./g, '');
      return removedDigit.replace(/,/, '.');
    }
    return numStr.replace(/,/, '.');
  } else {
    return numStr.replace(/,/g, '');
  }
}

export function convertStringNumber(num: number, digitRule: DigitRule): string {
  if (digitRule === 'default') {
    return new BigNumber(num).toFormat(FORMAT1);
  } else {
    return new BigNumber(num).toFormat(FORMAT2);
  }
}

export function getIntlLocales(): string {
  switch (getCachedLang()) {
    case 'es':
      return 'es-ES';
    case 'ja':
      return 'ja-JP';
    default:
      return 'en-US';
  }
}

export function dateString(dateObj: Date, showSeconds: boolean, showTimezone = false): string {
  // TODO: RN v0.70以降にアップグレード次第、IntlをiOSでも使えるようにする。(if文を削除するだけ。)
  if (Platform.OS === 'android') {
    const locale = getIntlLocales();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short', //'2-digit',
      day: '2-digit',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    };
    if (showSeconds) {
      options.second = '2-digit';
    }
    if (showTimezone) {
      options.timeZoneName = 'long';
    }
    return new Intl.DateTimeFormat(locale, options).format(dateObj);
  } else {
    return dateObj.toString();
  }
}
