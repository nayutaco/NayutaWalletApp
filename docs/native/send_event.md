# NativeModules

## send event from native to RN

### LndGrpcLightning

#### `grpc_watchLnInv`

[SubscribeInvoices API](https://lightning.engineering/api-docs/api/lnd/lightning/subscribe-invoices)

| key | value |
| ---- | ---- |
| "event" | "settled" |
| "param" | `r_hash` hex String |

| key | value |
| ---- | ---- |
| "event" | "completed" |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "param" | error string |

#### `grpc_watchTx`

[SubscribeTransactions API](https://lightning.engineering/api-docs/api/lnd/lightning/subscribe-transactions)

| key | value |
| ---- | ---- |
| "event" | "detect" |
| "txid" | `tx_hash` hex String |
| "confirm" | `num_confirmations` Int |
| "amount" | `amount` Int |
| "height" | `block_height` Int |
| "addresses" | `dest_addresses` []String |

| key | value |
| ---- | ---- |
| "event" | "completed" |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "reason" | error string |

#### `grpc_watchCh`

[SubscribeChannelEvents API](https://lightning.engineering/api-docs/api/lnd/lightning/subscribe-channel-events)

| key | value |
| ---- | ---- |
| "event" | "OPEN_CHANNEL" |
| "channel_point" | `channel_point` String |

| key | value |
| ---- | ---- |
| "event" | "CLOSED_CHANNEL" |
| "channel_point" | `channel_point` String |

| key | value |
| ---- | ---- |
| "event" | "completed" |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "reason" | error string |

#### `grpc_watchChanBackup`

[SubscribeChannelBackups API](https://lightning.engineering/api-docs/api/lnd/lightning/subscribe-channel-backups)

| key | value |
| ---- | ---- |
| "event" | "detect" |
| "count" | incremental number Int |
| "backupBase64" | Base64 String |
| "chanPoints" |  []<"funding_txid_str": String, "output_index": Int> |

| key | value |
| ---- | ---- |
| "event" | "completed" |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "reason" | error string |

### LndGrpcRouter

#### `grpc_payment`

[SendPaymentV2 API](https://lightning.engineering/api-docs/api/lnd/router/send-payment-v2)

| key | value |
| ---- | ---- |
| "event" | "payment" |
| "invoice" | invoice string |
| "hash" | payment hash string |
| "value" | value Int |
| "status" | status Int |
| "failure" | failure Int |

| key | value |
| ---- | ---- |
| "event" | "completed" |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "param" | error string |

### LspClient

#### `grpc_route_payment`

| key | value |
| ---- | ---- |
| "event" | "payment" |
| "hash" | payment hash string |
| "status" | status Int |
| "failure" | failure Int |

| key | value |
| ---- | ---- |
| "event" | "error" |
| "param" | error string |


## LND shutdown

iOS disconnect the LND gRPC server during app background. In my examination, the app cannot reconnect to LND.

1. Callback `completed` from gRPC subscribing API
  * channel event listener: bridge/closechecker
  * event 'grpc_watchLnInv': bridge/received
  * event 'grpc_watchTx': bridge/received
  * event 'grpc_watchChanBackup': bridge/received
2. Call `emitEventCompleted()` event and emit `eventCompleted` to app EventEmitter
3. Catch `eventCompleted`
  * set app shutdown flag
  * `LndReactController.shutdownLnd()` --> LND shutdown request
4. The Home screen detect shutdown flag and transfer to the Shutdown screen.
5. Catch `exit` event from LND after shutdown completed.
6. Call `forceRestart()`
