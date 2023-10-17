# Nayuta Wallet

Supports Lightning payment and automatic management using Lightning Service Provider(LSP)

Website: https://nayuta.co/nayuta-wallet-2022/

* [Google Play](https://play.google.com/store/apps/details?id=com.nayuta.core2)
* [App Store](https://apps.apple.com/jp/app/nayuta-wallet/id6449242331)

## System

```text
                        +------------------+           +--------------------+
+---------------------+ |                  |           |                    |
|NayutaWalletLspdProto| | NayutaWalletLspd +-----------+ NayutaWalletLspLnd |
|  API definition     | |   LSP daemon     |           |   LND              |
+---------------------+ |                  |           |                    |
                        +---------------+--+           +---------+----------+
                                        |                        |
                                        +------------------+     |
                                                           |     |
                      +----------------------------------------------------------+
                      |                                    |     |               |
                      | +-----------------+            +---+-----+-------------+ |
                      | |                 |            |                       | |
                      | | NayutaWalletApp +------------+ NayutaWalletAppLnd    | |
                      | |   Wallet app    |            |    LND                | |
                      | |                 |            |    LSP client         | |
                      | +-----------------+            +-----------------------+ |
                      |                                                          |
                      +----------------------------------------------------------+
```

### NayutaWalletApp

Mobile wallet application

* [Repository](https://github.com/nayutaco/NayutaWalletApp)
* Changes from released apps
  * remove network settings between Nayuta LSP.
  * remove new version information text.
  * change package name(Android)/AppID(iOS) to prevent released app overwriting.

### NayutaWalletLspdProto

LSP gRPC API definition

* [Repository](https://github.com/nayutaco/NayutaWalletLspdProto)
  * base: [github.com/breez/lspd](https://github.com/breez/lspd)/rpc

### NayutaWalletLspLnd

LND

* [Repository](https://github.com/nayutaco/NayutaWalletLndLsp)
  * base: [github.com/lightningnetwork/lnd](https://github.com/lightningnetwork/lnd)

### NayutaWalletLspd

LSP daemon for Nayuta Wallet

* [Repository](https://github.com/nayutaco/NayutaWalletLspd)
  * base: [github.com/breez/lspd](https://github.com/breez/lspd)

### NayutaWalletAppLnd

LND mobile library for Nayuta Wallet

* [Repository](https://github.com/nayutaco/NayutaWalletAppLnd)
  * base: [github.com/lightningnetwork/lnd](https://github.com/lightningnetwork/lnd)
