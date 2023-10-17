# backup 

* Android: v0.1.0-
* iOS: v1.0.0-

## 種類

* manual backup
  * OSが持つ「共有」動作に従う
* auto backup
  * Android: Google Driveへの保存
  * iOS: iCloud Driveへの保存

## バックアップ対象

以下のデータをそれぞれ別のファイルとしてバックアップする。

* LNDから取得したchannel backupデータ
  * JSONファイル
* SQLiteのapp.dbファイル
  * バイナリファイルそのまま

## manual backup

実行した時点でのバックアップ対象をユーザが指定した共有動作によって保存する。

### ファイル名

* LNDから取得したchannel backupデータ
  * `channel.backup`
* SQLiteのapp.dbファイル
  * `application.backup`

## auto backup

クラウドへのバックアップを有効にし、バックアップデータに変化が生じたら自動的にアップロードする。

### ファイル

Google DriveおよびiCloud Driveのアプリケーション用領域に保存するためユーザから見ることはできない。

#### LNDから取得したchannel backupデータ

##### file name

`channel-<NETWORK>-<NODE_ID>.backup`

##### data format

format version 1

```typescript
type ChanBackupVer1 = {
  version: number;      // 1
  backupBase64: string; // channel.backup base64 data
  chanPoints: {
    funding_txid_str: string; // TXID(RPC order)
    output_index: number;     // output index(0-)
  }[];
  info: {
    date: string;     // human readable date/time
    os: string;       // "Android" or "iOS"
    app: string;      // "Nayuta Wallet"
    version: string;  // application version
  };
};
```

#### SQLiteのapp.dbファイル

##### file name

`application-<NETWORK>-<NODE_ID>.backup`

##### data format

Encode SQLite database file to base64.

### 設定をONにしたとき

実行した時点でのバックアップ対象をクラウドストレージにアップロードする。

* Google Driveの場合
  * ログインも行う。
* iCloud Driveの場合
  * 端末のiCloud設定に従う。
    * iCloudにログインしていない場合はエラー
    * iCloudのアプリ設定で有効にされていない場合はエラー

### チャネルバックアップデータに変化が生じたとき

LNDのSubscribeChanBackupからコールバックされるとバックアップ対象のうちchannel backupデータだけをアップロードする。

### Submarine Swapに変化が生じたとき

Submarine SwapはSwapスクリプトへのBTCアドレス(以下、Swapアドレス)を作るため、NC2のウォレットが復元されたかどうかなど関係なくトランザクションを作って展開することが可能である。
Swapアドレスへの送金をSubmarine Swapとして処理しない場合は NC2がスクリプトを解いて指定したBTCアドレスにon-chain送金するようにしている(Refund動作)ため、Submarine Swapの状況が変化した場合はバックアップを取るようにしている。

## manual backupからの復元

メニューからは、チャネル残高の復元とアプリバックアップの復元という2つの項目がある。
パスフレーズからのウォレット復元直後に行うことを想定している。

### チャネル残高の復元

LNDの[RestoreChannelBackups](https://lightning.engineering/api-docs/api/lnd/lightning/restore-channel-backups)を実行する。

### アプリバックアップの復元

SQLiteのファイルを規定のディレクトリに配置し、再起動を行う。

## auto backupからの復元

Google DriveやiCloud Driveに自動保存されたファイルを使ってチャネル残高の復元とアプリバックアップの復元を行う。

### Android(Google Drive)

アプリ起動時、ウォレットが存在しない場合には「新規作成」「復元」の選択になる。
復元を選択した場合はパスフレーズ入力後にGoogleアカウントでのログインを求められ、以下の条件が揃った場合にはウォレット復元後にバックアップ対象からの復元を行う。

* ログインに成功する
* パスフレーズから復元したnode_idをファイル名に使ったバックアップファイルが存在する。

### iOS(iCloud Drive)

端末のiCloud設定でバックアップデータにアクセスできる場合、パスフレーズからのウォレット復元後にバックアップ対象からの復元を行う。

## 自動バックアップの通知

### Android

* 通知バーに直近で実行したバックアップの結果を表示
* 「Detail Settings > Backup: Google Drive」のサブタイトルにGoogleアカウントと最後に実行したバックアップ日時を表示

### iOS

* 「Detail Settings > Backup: iCloud Drive」のサブタイトルに最後に実行したバックアップの結果と日時を表示
