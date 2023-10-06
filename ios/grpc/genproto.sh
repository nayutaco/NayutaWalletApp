#!/bin/sh -eu

# grpc-swift v1.x
# https://github.com/grpc/grpc-swift#versions

PROTOC_GEN=`which protoc-gen-swift`
PROTOC_GEN_GRPC=`which protoc-gen-grpc-swift`
PROTODIR=../../android/app/src/main/proto
OUTDIR=.

function generate() {
    fname=$PROTODIR/$1
    protoc $fname \
        --proto_path=$PROTODIR \
        --plugin=${PROTOC_GEN} \
        --swift_opt=Visibility=Public \
        --swift_out=$OUTDIR

    protoc $fname \
        --proto_path=$PROTODIR \
        --plugin=${PROTOC_GEN_GRPC} \
        --grpc-swift_opt=Visibility=Public,Server=false \
        --grpc-swift_out=$OUTDIR
}

rm -f $OUTDIR/*.swift
generate lightning.proto
generate router.proto
generate lspclient.proto

echo "done"
ls -l $OUTDIR/*.swift
