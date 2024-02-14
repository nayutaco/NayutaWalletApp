# Secure Storage

## [react-native-keychain](https://github.com/oblador/react-native-keychain)

* [store/keychain](../store/keychain.ts)

`setGenericPassword()`

| username | generate | service |
| -------- | -------- | ------- |
| walletSeed | REST '/v1/genseed'<br/>user input on recovery startup | com.nayuta.core2.lnd.seed |
| walletPassword | `generateSecureRandom(32)` | com.nayuta.core2.lnd.password |
| adminMacaroon | REST '/v1/initwallet' | com.nayuta.core2.lnd.macaroon.admin |

### memo

AndroidとiOSではreact-native-keychainで保存したデータがある状態でアプリをアンインストールしたときの挙動が異なる。
Androidではアプリのアンインストールとともにデータも削除されるが、iOSではデータが残るようになっている。
OSの挙動の違いなので、同じ挙動にしたくてもライブラリでは対処できず、アプリで解決するしかないとのこと。

Nayuta Walletではreact-native-keychainに保存したデータはアプリのアンインストールによって無効になってほしいため、アプリデータを保存している ./store/storage.ts でデータの有無を`'hasWallet'`で管理している。
起動時に`hasWallet`を確認し、`false`であればkeychainにデータが保存されていたとしても無視してウォレットがないものとして動作する。

## [react-native-aes-crypto](https://github.com/tectiv3/react-native-aes)

* [appdb/](../appdb/index.ts)

Submarine Swapの管理にSQLiteを使っているが、鍵情報を保存するため暗号化が必要となって導入した。

* database: app.db
* DB table: [`submarines`](lspclient/submarineDb.plantuml)
* encode data
  * `preimage`
  * `repayPrivkey`

## [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage)

* [store/storeContext](../store/storeContext.tsx)
* [store/storage.ts](../store/storage.ts)

暗号化しない状態でkey-valueデータを保存する。
AndroidではSQLiteを、iOSではJSONファイルなどで保存される([出展](https://react-native-async-storage.github.io/async-storage/docs/advanced/where_data_stored))。

key-valueのvalueは文字列だけしかサポートされないため、storeContext.tsx がその仲介を行っている。実装当初は画面の設定を保存するだけだったためReactの`useReducer`などを使って実装されていたが、画面以外からも操作したいシーンが出てきたため storege.ts を作ったという経緯がある。
