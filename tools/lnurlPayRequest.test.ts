import {PaymentData, getPaymentData, requestInvoice} from './lnurlPayRequest';

import Satoshi from 'types/Satoshi';

const expectedData: PaymentData = {
  tag: 'payRequest',
  callback: new URL('https://nayuta.co/v1/lnurl/pay'),
  minSendable: Satoshi.fromSat(1),
  maxSendable: Satoshi.fromSat(100),
  metadata: '[["text/plain", "Nayuta LNURL Pay"]]',
};

const expectedDataWithQuery: PaymentData = {
  tag: 'payRequest',
  callback: new URL('https://nayuta.co/v1/lnurl/pay?projectId=12345'),
  minSendable: Satoshi.fromSat(1),
  maxSendable: Satoshi.fromSat(100),
  metadata: '[["text/plain", "Nayuta LNURL Pay"]]',
};

const lnurlEndpoint = new URL('https://nayuta.co/v1/lnurl/pay');

global.fetch = jest.fn();

describe('getPaymentData', () => {
  const successResp = {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        tag: 'payRequest',
        callback: 'https://nayuta.co/v1/lnurl/pay',
        minSendable: 1000,
        maxSendable: 100000,
        metadata: '[["text/plain", "Nayuta LNURL Pay"]]',
      }),
  };

  const successRespWithQuery = {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        tag: 'payRequest',
        callback: 'https://nayuta.co/v1/lnurl/pay?projectId=12345',
        minSendable: 1000,
        maxSendable: 100000,
        metadata: '[["text/plain", "Nayuta LNURL Pay"]]',
      }),
  };

  const missingFieldResp = (json: unknown) => {
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(json),
    };
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

    return getPaymentData(lnurlEndpoint).then(resp => {
      expect(resp).toStrictEqual(expectedData);
    });
  });
  it('got correct response with query', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successRespWithQuery);

    return getPaymentData(lnurlEndpoint).then(resp => {
      expect(resp).toStrictEqual(expectedDataWithQuery);
    });
  });
  it('got 400 error', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(notFoundResp);

    return getPaymentData(lnurlEndpoint).catch(err => {
      expect(err).toEqual(
        new Error(
          'Failed to get data from https://nayuta.co/v1/lnurl/pay: got error response from lnurl server. status=400, message=Not Found: {"reason":"this is reason"}',
        ),
      );
    });
  });
  it('got 500 response', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(internalServerErrorResp);

    return getPaymentData(lnurlEndpoint).catch(err => {
      expect(err).toEqual(
        new Error(
          'Failed to get data from https://nayuta.co/v1/lnurl/pay: got error response from lnurl server. status=500, message=Internal Server Error: {"reason":"Unexpected error"}',
        ),
      );
    });
  });
  test.each`
    response                                                                                                                                                    | expected
    ${missingFieldResp({tag: 'payRequest', callback: 'https://nayuta.co/v1/lnurl/pay', minSendable: 1000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})}   | ${new Error('maxSendable=undefined is invalid value')}
    ${missingFieldResp({tag: 'payRequest', callback: 'https://nayuta.co/v1/lnurl/pay', maxSendable: 1000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})}   | ${new Error('minSendable=undefined is invalid value')}
    ${missingFieldResp({callback: 'https://nayuta.co/v1/lnurl/pay', minSendable: 1000, maxSendable: 100000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})} | ${new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify({callback: 'https://nayuta.co/v1/lnurl/pay', minSendable: 1000, maxSendable: 100000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})}`)}
    ${missingFieldResp({tag: 'payRequest', minSendable: 1000, maxSendable: 100000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})}                          | ${new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify({tag: 'payRequest', minSendable: 1000, maxSendable: 100000, metadata: '[["text/plain", "Nayuta LNURL Pay"]]'})}`)}
    ${missingFieldResp({tag: 'payRequest', callback: 'https://nayuta.co/v1/lnurl/pay', minSendable: 1000, maxSendable: 100000})}                                | ${new Error(`given JSON can not be converted into PaymentData: ${JSON.stringify({tag: 'payRequest', callback: 'https://nayuta.co/v1/lnurl/pay', minSendable: 1000, maxSendable: 100000})}`)}
  `('throw error if required field is missing', ({response, expected}) => {
    fetch.mockResolvedValueOnce(response);

    return getPaymentData(lnurlEndpoint).catch(err => {
      expect(err).toEqual(expected);
    });
  });
});

describe('requestInvoice', () => {
  const successResp = {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        pr: 'dummy invoice',
        routes: [],
      }),
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

    return requestInvoice(expectedData, Satoshi.fromSat(10)).then(() => {
      expect(fetch).toHaveBeenCalledWith('https://nayuta.co/v1/lnurl/pay?amount=10000', expect.objectContaining({method: 'GET'}));
    });
  });

  it('request with correct arguments with query', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successResp);

    return requestInvoice(expectedDataWithQuery, Satoshi.fromSat(10)).then(() => {
      expect(fetch).toHaveBeenCalledWith('https://nayuta.co/v1/lnurl/pay?projectId=12345&amount=10000', expect.objectContaining({method: 'GET'}));
    });
  });

  it('get success response', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(successResp);

    return requestInvoice(expectedData, Satoshi.fromSat(10)).then(resp => {
      expect(resp).toStrictEqual('dummy invoice');
    });
  });
  it('get 500 error', () => {
    expect.assertions(1);
    fetch.mockResolvedValueOnce(internalServerErrorResp);

    return requestInvoice(expectedData, Satoshi.fromSat(10)).catch(err => {
      expect(err).toStrictEqual(new Error('Got failed response: status=500, message=Internal Server Error: {"reason":"Unexpected error"}'));
    });
  });
});
