import {convertSatoshi} from './currencyConvert';

import Satoshi from 'types/Satoshi';

jest.mock('./btctools', () => {
  const originalModule = jest.requireActual('./btctools');

  return {
    __esModule: true,
    ...originalModule,
    convertCryptoToFiat: jest.fn(),
  };
});

// Mock btc jpy rate as 1 BTC = 5_000_000 JPY
const mockBtcJpyRate = (btc: number) => {
  const jpy = btc * 5_000_000;
  jest.requireMock('./btctools').convertCryptoToFiat.mockResolvedValue(String(jpy));
};

describe('convertSatoshi', () => {
  describe('format result', () => {
    test('1 BTC to jpy', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'jpy', true)).resolves.toBe('5000000');
    });
    test('2 BTC to jpy', async () => {
      const btc = 2;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'jpy', true)).resolves.toBe('10000000');
    });
    test('to sat', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'sat', true)).resolves.toBe('100,000,000');
    });
    test('to btc', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'btc', true)).resolves.toBe('1');
    });
  });

  describe('not format result', () => {
    test('1 BTC to jpy', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'jpy', false)).resolves.toBe('5000000');
    });
    test('2 BTC to jpy', async () => {
      const btc = 2;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'jpy', false)).resolves.toBe('10000000');
    });
    test('to sat', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'sat', false)).resolves.toBe('100000000');
    });
    test('to btc', async () => {
      const btc = 1;
      mockBtcJpyRate(btc);
      await expect(convertSatoshi(Satoshi.fromBTC(btc), 'btc', false)).resolves.toBe('1');
    });
  });
});
