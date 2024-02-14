import {NativeModules} from 'react-native';
import {isBase64} from 'tools';
import {qrResolver, QrType} from 'tools/qrresolver';
import Satoshi from 'types/Satoshi';

test('[OK] BIP21 - bitcoin:bc(mainnet)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: 'bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv',
    params: {
      amount: Satoshi.fromBTC(0.1),
    },
  };

  expect(await qrResolver('bitcoin:bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv?amount=0.1')).toEqual(expectedRes);
});

test('[NG] BIP21 - bitcoin:bc(testnet)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(async () => await qrResolver('bitcoin:bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv?amount=0.1')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[OK] BIP21 - bitcoin:tb+amount(testnet)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: 'tb1qrpyguxynsvl4t27dunmwxv9cr8fplvfyp065yu',
    params: {
      amount: Satoshi.fromBTC(0.1),
    },
  };

  expect(await qrResolver('bitcoin:tb1qrpyguxynsvl4t27dunmwxv9cr8fplvfyp065yu?amount=0.1')).toEqual(expectedRes);
});

test('[NG] BIP21 - bitcoin:tb+amount(testnet)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(async () => await qrResolver('tb1qrpyguxynsvl4t27dunmwxv9cr8fplvfyp065yu?amount=-0.1')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[OK] not BIP21 - mainnet(bc)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: 'bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv',
  };

  expect(await qrResolver('bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv')).toEqual(expectedRes);
});

test('[NG] not BIP21 - testnet(bc)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(async () => await qrResolver('bc1qdc6r8l3p28czx5zhvmq68afy9n7g85qkjarutv')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[NG] not BIP21 - mainnet(tb)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  expect(async () => await qrResolver('TB1QHUU23ETMT3QVENUV7RCYG38CPHRYN9EVG92YND')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[OK] not BIP21 - testnet(tb)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: 'TB1QHUU23ETMT3QVENUV7RCYG38CPHRYN9EVG92YND',
  };

  expect(await qrResolver('TB1QHUU23ETMT3QVENUV7RCYG38CPHRYN9EVG92YND')).toEqual(expectedRes);
});

test('[OK] not BIP21 - mainnet(1)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX',
  };

  expect(await qrResolver('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX')).toEqual(expectedRes);
});

test('[NG] not BIP21 - testnet(1)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(async () => await qrResolver('1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[OK] not BIP21 - mainnet(3)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: '37NFX8KWAQbaodUG6pE1hNUH1dXgkpzbyZ',
  };

  expect(await qrResolver('37NFX8KWAQbaodUG6pE1hNUH1dXgkpzbyZ')).toEqual(expectedRes);
});

test('[NG] not BIP21 - testnet(3)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(async () => await qrResolver('37NFX8KWAQbaodUG6pE1hNUH1dXgkpzbyZ')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[NG] not BIP21 - mainnet(m)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  expect(async () => await qrResolver('mvH6CfDe9hoorbG1GCCe3ocPdvx8qdKszn')).rejects.toThrow('qrscanner:invalidAddr');
});

test('[OK] not BIP21 - testnet(m)', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  const expectedRes: QrType = {
    type: 'bitcoin',
    address: 'mvH6CfDe9hoorbG1GCCe3ocPdvx8qdKszn',
  };

  expect(await qrResolver('mvH6CfDe9hoorbG1GCCe3ocPdvx8qdKszn')).toEqual(expectedRes);
});

// cannot test 'lninvoice' OK pattern because of LND not running on jest.

// because of non return mock, 'lninvoice' always returns false
test('[NG] lninvoice(mainnet(bc))', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  expect(
    async () =>
      await qrResolver(
        'lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w',
      ),
  ).rejects.toThrow('qrscanner:errorInvalid');
});

test('[NG] lninvoice(testnet(bc))', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(
    async () =>
      await qrResolver(
        'lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w',
      ),
  ).rejects.toThrow('qrscanner:errorInvalid');
});

test('[NG] lninvoice(mainnet(tb))', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'mainnet',
  };
  expect(
    async () =>
      await qrResolver(
        'lntb20m1pvjluezhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfpp3x9et2e20v6pu37c5d9vax37wxq72un98kmzzhznpurw9sgl2v0nklu2g4d0keph5t7tj9tcqd8rexnd07ux4uv2cjvcqwaxgj7v4uwn5wmypjd5n69z2xm3xgksg28nwht7f6zspwp3f9t',
      ),
  ).rejects.toThrow('qrscanner:errorInvalid');
});

test('[NG] lninvoice(testnet(tb))', async () => {
  NativeModules.AppConfig = {
    NETWORK: 'testnet',
  };
  expect(
    async () =>
      await qrResolver(
        'lntb20m1pvjluezhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfpp3x9et2e20v6pu37c5d9vax37wxq72un98kmzzhznpurw9sgl2v0nklu2g4d0keph5t7tj9tcqd8rexnd07ux4uv2cjvcqwaxgj7v4uwn5wmypjd5n69z2xm3xgksg28nwht7f6zspwp3f9t',
      ),
  ).rejects.toThrow('qrscanner:errorInvalid');
});

// test('[OK] lnurl', async () => {
//   const expectedRes: QrType = {
//     type: 'lnurl',
//     decoded: 'https://hubtest.nayuta.co/u?q=44be58a2b00bded3a9635b5b1eef78f3de7aa54ebc895b8276f6d4c64f898745',
//   };

//   expect(
//     await qrResolver(
//       'lnurl1dp68gurn8ghj76r4vf6x2um59ehxz7t4w3sjucm09a6n7ufaxs6xyef48psnyc3sxp3xgetyxdsnjd3nx43r2c33v4jkvdecvcekgefhv9sn2dr9vf3nswf4vgurydekvcmxgdrrxc6xvwpe8qmngdgqh78e0',
//     ),
//   ).toEqual(expectedRes);
// });

// test('[OK] LNURL', async () => {
//   const expectedRes: QrType = {
//     type: 'lnurl',
//     decoded: 'https://hubtest.nayuta.co/u?q=44be58a2b00bded3a9635b5b1eef78f3de7aa54ebc895b8276f6d4c64f898745',
//   };

//   expect(
//     await qrResolver(
//       'LNURL1DP68GURN8GHJ76R4VF6X2UM59EHXZ7T4W3SJUCM09A6N7UFAXS6XYEF48PSNYC3SXP3XGETYXDSNJD3NX43R2C33V4JKVDECVCEKGEFHV9SN2DR9VF3NSWF4VGURYDEKVCMXGDRRXC6XVWPE8QMNGDGQH78E0',
//     ),
//   ).toEqual(expectedRes);
// });

// test('[OK] lnurl-lightning', async () => {
//   const expectedRes: QrType = {
//     type: 'lnurl',
//     decoded: 'https://hubtest.nayuta.co/u?q=44be58a2b00bded3a9635b5b1eef78f3de7aa54ebc895b8276f6d4c64f898745',
//   };

//   expect(
//     await qrResolver(
//       'lightning:lnurl1dp68gurn8ghj76r4vf6x2um59ehxz7t4w3sjucm09a6n7ufaxs6xyef48psnyc3sxp3xgetyxdsnjd3nx43r2c33v4jkvdecvcekgefhv9sn2dr9vf3nswf4vgurydekvcmxgdrrxc6xvwpe8qmngdgqh78e0',
//     ),
//   ).toEqual(expectedRes);
// });

// test('[OK] LNURL-LIGHTNING', async () => {
//   const expectedRes: QrType = {
//     type: 'lnurl',
//     decoded: 'https://hubtest.nayuta.co/u?q=44be58a2b00bded3a9635b5b1eef78f3de7aa54ebc895b8276f6d4c64f898745',
//   };

//   expect(
//     await qrResolver(
//       'LIGHTNING:LNURL1DP68GURN8GHJ76R4VF6X2UM59EHXZ7T4W3SJUCM09A6N7UFAXS6XYEF48PSNYC3SXP3XGETYXDSNJD3NX43R2C33V4JKVDECVCEKGEFHV9SN2DR9VF3NSWF4VGURYDEKVCMXGDRRXC6XVWPE8QMNGDGQH78E0',
//     ),
//   ).toEqual(expectedRes);
// });

// test('[NG] lnurl', async () => {
//   expect(
//     async () =>
//       await qrResolver(
//         'lnurl1sp68gurn8ghj76r4vf6x2um59ehxz7t4w3sjucm09a6n7ufaxs6xyef48psnyc3sxp3xgetyxdsnjd3nx43r2c33v4jkvdecvcekgefhv9sn2dr9vf3nswf4vgurydekvcmxgdrrxc6xvwpe8qmngdgqh78e0',
//       ),
//   ).rejects.toThrow('qrscanner:notCorrectLnurl');
// });

// test('[OK] lnurl scheme', async () => {
//   const expectedRes: QrType = {
//     type: 'lnurl',
//     decoded: 'https://hubtest.nayuta.co/u?q=44be58a2b00bded3a9635b5b1eef78f3de7aa54ebc895b8276f6d4c64f898745',
//   };

//   expect(
//     await qrResolver(
//       'https://service.com/giftcard/redeem?id=123&lightning=lnurl1dp68gurn8ghj76r4vf6x2um59ehxz7t4w3sjucm09a6n7ufaxs6xyef48psnyc3sxp3xgetyxdsnjd3nx43r2c33v4jkvdecvcekgefhv9sn2dr9vf3nswf4vgurydekvcmxgdrrxc6xvwpe8qmngdgqh78e0',
//     ),
//   ).toEqual(expectedRes);
// });

test('[NG] lnurl scheme(not correct)', async () => {
  expect(async () => await qrResolver('https://service.com/giftcard/redeem?id=123&lightning=lnurl')).rejects.toThrow('qrscanner:notCorrectLnurl');
});

test('[NG] lnurl scheme(not exist)', async () => {
  expect(async () => await qrResolver('https://service.com/giftcard/redeem')).rejects.toThrow('qrscanner:errorInvalid');
});

test('[OK] lnnode', async () => {
  const expectedRes: QrType = {
    type: 'lnnode',
    value: '021c97a90a411ff2b10dc2a8e32de2f29d2fa49d41bfbb52bd416e460db0747d0d@54.184.88.251:9735',
  };

  expect(await qrResolver('021c97a90a411ff2b10dc2a8e32de2f29d2fa49d41bfbb52bd416e460db0747d0d@54.184.88.251:9735')).toEqual(expectedRes);
});

test('[OK] LNNODE', async () => {
  const expectedRes: QrType = {
    type: 'lnnode',
    value: '021C97A90A411FF2B10DC2A8E32DE2F29D2FA49D41BFBB52BD416E460DB0747D0D@54.184.88.251:9735',
  };

  expect(await qrResolver('021C97A90A411FF2B10DC2A8E32DE2F29D2FA49D41BFBB52BD416E460DB0747D0D@54.184.88.251:9735')).toEqual(expectedRes);
});

test('[NG] lnnode', async () => {
  const expectedRes: QrType = {
    type: 'lnnode',
    value: '022c97a90a411ff2b10dc2a8e32de2f29d2fa49d41bfbb52bd416e460db0747d0d@54.184.88.251:9735',
  };

  expect(await qrResolver('022c97a90a411ff2b10dc2a8e32de2f29d2fa49d41bfbb52bd416e460db0747d0d@54.184.88.251:9735')).toEqual(expectedRes);
});

test('[NG] unknown - lndconnect', async () => {
  expect(
    async () =>
      await qrResolver(
        'lndconnect://192.168.1.4:10009?cert=MIICiDCCAi-gAwIBAgIQdo5v0QBXHnji4hRaeeMjNDAKBggqhkjOPQQDAjBHMR8wHQYDVQQKExZsbmQgYXV0b2dlbmVyYXRlZCBjZXJ0MSQwIgYDVQQDExtKdXN0dXNzLU1hY0Jvb2stUHJvLTMubG9jYWwwHhcNMTgwODIzMDU1ODEwWhcNMTkxMDE4MDU1ODEwWjBHMR8wHQYDVQQKExZsbmQgYXV0b2dlbmVyYXRlZCBjZXJ0MSQwIgYDVQQDExtKdXN0dXNzLU1hY0Jvb2stUHJvLTMubG9jYWwwWTATBgcqhkjOPQIBBggqhkiOPQMBBwNCAASFhRm-w_T10PoKtg4lm9hBNJjJD473fkzHwPUFwy91vTrQSf7543j2JrgFo8mbTV0VtpgqkfK1IMVKMLrF21xio4H8MIH5MA4GA1UdDwEB_wQEAwICpDAPBgNVHRMBAf8EBTADAQH_MIHVBgNVHREEgc0wgcqCG0p1c3R1c3MtTWFjQm9vay1Qcm8tMy5sb2NhbIIJbG9jYWxob3N0ggR1bml4ggp1bml4cGFja2V0hwR_AAABhxAAAAAAAAAAAAAAAAAAAAABhxD-gAAAAAAAAAAAAAAAAAABhxD-gAAAAAAAAAwlc9Zck7bDhwTAqAEEhxD-gAAAAAAAABiNp__-GxXGhxD-gAAAAAAAAKWJ5tliDORjhwQKDwAChxD-gAAAAAAAAG6Wz__-3atFhxD92tDQyv4TAQAAAAAAABAAMAoGCCqGSM49BAMCA0cAMEQCIA9O9xtazmdxCKj0MfbFHVBq5I7JMnOFPpwRPJXQfrYaAiBd5NyJQCwlSx5ECnPOH5sRpv26T8aUcXbmynx9CoDufA&macaroon=AgEDbG5kArsBAwoQ3_I9f6kgSE6aUPd85lWpOBIBMBoWCgdhZGRyZXNzEgRyZWFkEgV3cml0ZRoTCgRpbmZvEgRyZWFkEgV32ml0ZRoXCghpbnZvaWNlcxIEcmVhZBIFd3JpdGUaFgoHbWVzc2FnZRIEcmVhZBIFd3JpdGUaFwoIb2ZmY2hhaW4SBHJlYWQSBXdyaXRlGhYKB29uY2hhaW4SBHJlYWQSBXdyaXRlGhQKBXBlZXJzEgRyZWFkEgV3cml0ZQAABiAiUTBv3Eh6iDbdjmXCfNxp4HBEcOYNzXhrm-ncLHf5jA',
      ),
  ).rejects.toThrow('qrscanner:errorInvalid');
});

test('[NG] unknown', async () => {
  expect(async () => await qrResolver('')).rejects.toThrow('qrscanner:errorInvalid');
});

test('[OK] isBase64OK', async () => {
  expect(isBase64('VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIDEzIGxhenkgZG9ncy4=')).toBeTruthy();
});

test('[NG] isBase64NG', async () => {
  expect(isBase64('VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIDEzIGxhenkgZG9ncy4/=')).toBeFalsy();
});
