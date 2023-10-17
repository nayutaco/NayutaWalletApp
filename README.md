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

* Repository
  * [Android](https://github.com/nayutaco/NayutaWalletApp/tree/android-v0.3.0)
  * [iOS](https://github.com/nayutaco/NayutaWalletApp/tree/ios-v1.2.0)

* Changes from released apps
  * remove network settings between Nayuta LSP.
  * remove new version information text.
  * change package name(Android)/AppID(iOS) to prevent released app overwriting.

### NayutaWalletLspdProto

LSP gRPC API definition

* [Repository](https://github.com/nayutaco/NayutaWalletLspdProto/tree/refs/tags/v0.5.6)
  * base: [github.com/breez/lspd ad0595f3f9](https://github.com/breez/lspd/tree/ad0595f3f9dc417dd2371215ec9c52ea2c66a801)/rpc

### NayutaWalletLspLnd

LND

* [Repository](https://github.com/nayutaco/NayutaWalletLspLnd/tree/v0.15.4-beta.lsp-v0.2.1)
  * base: [github.com/lightningnetwork/lnd v0.15.4-beta](https://github.com/lightningnetwork/lnd/tree/v0.15.4-beta)

### NayutaWalletLspd

LSP daemon for Nayuta Wallet

* [Repository](https://github.com/nayutaco/NayutaWalletLspd/tree/v0.6.0)
  * base: [github.com/breez/lspd ad0595f3f9](https://github.com/breez/lspd/tree/ad0595f3f9dc417dd2371215ec9c52ea2c66a801)

### NayutaWalletAppLnd

LND mobile library for Nayuta Wallet

* [Repository](https://github.com/nayutaco/NayutaWalletAppLnd/tree/v0.15.4-beta.app-v0.2.10)
  * base: [github.com/lightningnetwork/lnd v0.15.4-beta](https://github.com/lightningnetwork/lnd/tree/v0.15.4-beta)
