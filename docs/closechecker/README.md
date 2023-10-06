# Close Checker

## Android

### 概要

* LNDが起動していない状態でもバックグラウンドでチャネルクローズの監視を行う
    * revoked transaction close の対応を CSV_DELAY ブロック以内に行う必要があるため
* チャネルがクローズされているのを検知した場合、ユーザに通知を出してアプリ起動を促す
    * アプリを起動して LND に対応してもらう
* 端末再起動でもバックグラウンド監視を立ち上げる

### 構成

* アプリ起動時に AlarmManager で定期的に呼び出すよう登録
* アプリ起動時に BOOT_COMPLETED intent を受信して AlarmManager 登録を行う
* Golang で Electrum Server を使って channel point の UTXO 状態を取得
    * LND を使わないが Lndmobile.aar に組み込む
    * channel point はあらかじめ チェック用DB(新規追加: files/closecheck.db) に保存しておく
    * [checksum0/go-electrum](https://github.com/checksum0/go-electrum)
* Android で定期的に Golang の処理を実行する
    * アラームは 8時間ごと
    * LND起動済み、あるいは Debug で disabled になっている場合はアラームが発生しても何もしない
* ReactNative からチェック用DB に書き込む
    * アプリ起動後のHome画面遷移前とLND終了要求前に LND の listchannels と同期
        * Mutual Closeの場合はLND起動時に行われるため DBには書き込まれない
    * チャネルオープン検知で channelpoint 追加
    * チャネルクローズ完了検知で channelpoint 削除
        * listchannels と同期するなら不要だが、想定していないルートで処理が行われることを懸念して行っている
        * クローズは pending になったタイミングで削除してもよいかもしれない
* チェック成功時、1つでもクローズしたチャネルがあれば notification を表示する
    * アプリを起動すると listchannels と同期することにより DBから削除されて notification は表示されない
* チェック失敗時、最初に発生したチェック失敗からの期間が `limitMinute` を超すと notification を表示する
    * アプリを起動すると DB同期することで `cchk_fail_started` が削除され notification が表示されない
* 設定値
    * Android: SharedPreference
        * `cchk_alarm_enabled: Boolean`
            * `enabled`: `false` か LND起動中はチェックを行わない。
            * デフォルト値: `true`
        * `cchk_alarm_period: Int`
            * `intervalMinute`: アラームの起動間隔
            * デフォルト値: 8時間
        * `cchk_alarm_limit: Int`
            * `limitMinute` : チェック失敗を許容する最長期間
            * デフォルト値: 20日
        * `cchk_fail_started: Int`
            * 最初に失敗したチェック失敗と時間(msec)
            * 以下の場合に削除する
                * チェックに成功
                * DB同期
                * アラームのタイミングでチェックを行わない場合
