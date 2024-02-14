# LSP client

## Overview

```text
+-----------+          +--------------+
|    HUB    |          |  Lndmobile   |
|  +-----+  |          |  +--------+  |
|  | LSP +----------------+ LSP    +--------------+
|  +--+--+  |          |  | client |  |           |
|     |     |          |  +--+-----+  |        +--+-----+        +--------+
|     |     |          |     |        |        | Java   +--------+ React  |
|     |     |          |     |        |        | Kotlin |        | Native |
|     |     |          |     |        |        +--+-----+        +--------+
|  +--+--+  |          |  +--+--+     |           |
|  | LND +----------------+ LND +-----------------+
|  +-----+  |          |  +-----+     |
+-----------+          +--------------+
```

## Connection

### LSP -- LSP client

customized LSP gRPC

### LND -- LSP client

[LND gRPC](https://api.lightning.community/)

### Lndmobile -- Java/Kotlin

* Lndmobile method
* REST API(for React Native)
* gRPC(for React Native)

### Java/Kotlin -- React Native

* ReactNative→Java/Kotlin: [Native Module](https://reactnative.dev/docs/native-modules-android)
* Java/Kotlin→React Native: [callback](https://reactnative.dev/docs/native-modules-android#callbacks)

## Functions

### On-The-Fly channel creation

Create Lightning channel with zero funding transaction confirmation.

### Submarine Swap

#### Receive Bitcoin and Create On-The-Fly channel

1. Register payment hash to LSP and create swap address
1. Pay Bitcoin to the swap address larger than fee
1. Wait Bitcoin transaction confirmation...
1. Client notifies LSP of the remittance detection to the swap address
1. LSP redeem from swap script and start On-The-Fly channel creation.

### Repayment Bitcoin from swap address

1. Ask the user for the Bitcoin address to send
1. Collect UTXOs sent to the swap addresses that are more than _n_ blocks past
1. Create transaction to redeem the swap script
1. Broadcast the transaction
