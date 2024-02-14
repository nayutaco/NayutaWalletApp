import {fromRawUrl, getWithdrawMetaData, requestWithdraw, WithdrawMetaData} from './lnurl';

import Satoshi from 'types/Satoshi';

const expectedMetaData: WithdrawMetaData = {
  tag: 'withdrawRequest',
  callback: new URL('https://nayuta.co/v1/lnurl/withdraw'),
  k1: 'fjdaklds',
  minWithdrawable: Satoshi.fromSat(5),
  maxWithdrawable: Satoshi.fromSat(10),
  defaultDescription: 'This is test',
};

describe('fromRawUrl', () => {
  it('decode LNURL to withdrawRequest object', () => {
    const url = new URL(
      'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&k1=fjdaklds&minWithdrawable=5000&maxWithdrawable=10000&defaultDescription=This is test&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
    );
    expect(fromRawUrl(url)).toStrictEqual(expectedMetaData);
  });

  describe('required parameter check', () => {
    test('missing minWithdraw field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&k1=fjdaklds&maxWithdrawable=10000&defaultDescription=This is test&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('missing maxWithdraw field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&k1=fjdaklds&minWithdrawable=5000&defaultDescription=This is test&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('missing callback field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&k1=fjdaklds&minWithdrawable=5000&maxWithdrawable=10000&defaultDescription=This is test',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('missing tag field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?k1=fjdaklds&minWithdrawable=5000&maxWithdrawable=10000&defaultDescription=This is test&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('missing defaultDescription field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&k1=fjdaklds&minWithdrawable=5000&maxWithdrawable=10000&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('missing k1 field', () => {
      const url = new URL(
        'https://nayuta.co/v1/lnurl/withdraw?tag=withdrawRequest&minWithdrawable=5000&maxWithdrawable=10000&defaultDescription=This is test&callback=https%3A%2F%2Fnayuta.co%2Fv1%2Flnurl%2Fwithdraw',
      );
      expect(fromRawUrl(url)).toBeNull();
    });
    test('non params', () => {
      const url = new URL('https://nayuta.co/v1/lnurl/withdraw');
      expect(fromRawUrl(url)).toBeNull();
    });
  });
});

const metaDataEndpoint = new URL('https://nayuta.co/v1/lnurl/withdraw');

global.fetch = jest.fn();

describe('getWithdrawMetaData', () => {
  const successResp = {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        tag: 'withdrawRequest',
        callback: 'https://nayuta.co/v1/lnurl/withdraw',
        k1: 'fjdaklds',
        minWithdrawable: 5000,
        maxWithdrawable: 10000,
        defaultDescription: 'This is test',
      }),
  };

  const notFoundResp = {
    ok: false,
    status: 400,
    statusText: 'Not Found',
    json: () => Promise.resolve({reason: 'this is reason'}),
  };

  const internalServerErrorResp = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: () => Promise.resolve({reason: 'Unexpected error'}),
  };

  it('got correct response', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successResp);

    return getWithdrawMetaData(metaDataEndpoint).then(resp => {
      expect(resp).toStrictEqual(expectedMetaData);
    });
  });
  it('got 400 error', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(notFoundResp);

    return getWithdrawMetaData(metaDataEndpoint).catch(err => {
      expect(err).toEqual(new Error('got error response from lnurl server. status=400, message=Not Found: {"reason":"this is reason"}'));
    });
  });
  it('got 500 response', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(internalServerErrorResp);

    return getWithdrawMetaData(metaDataEndpoint).catch(err => {
      expect(err).toEqual(
        new Error('got error response from lnurl server. status=500, message=Internal Server Error: {"reason":"Unexpected error"}'),
      );
    });
  });
});

describe('requestWithdraw', () => {
  const successResp = {
    ok: true,
    status: 200,
    json: () => Promise.resolve({status: 'success'}),
  };

  const internalServerErrorResp = {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: () => Promise.resolve({reason: 'Unexpected error'}),
  };

  it('request with correct arguments', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successResp);

    return requestWithdraw(expectedMetaData).then(() => {
      expect(fetch).toHaveBeenCalledWith('https://nayuta.co/v1/lnurl/withdraw?k1=fjdaklds&pr=dummy_invoice', {method: 'GET'});
    });
  });

  it('get success response', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successResp);

    return requestWithdraw(expectedMetaData).then(resp => {
      expect(resp).toStrictEqual({status: 'success'});
    });
  });
  it('get 500 error', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(internalServerErrorResp);

    return requestWithdraw(expectedMetaData).catch(err => {
      expect(err).toStrictEqual(new Error('got failed response: status=500, message=Internal Server Error: {"reason":"Unexpected error"}'));
    });
  });
});
