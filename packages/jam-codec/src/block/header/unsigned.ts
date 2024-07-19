import { JamCodec } from "@/codec.js";
import { JamHeader } from "@vekexasia/jam-types";
import { LittleEndian } from "@/ints/littleEndian.js";
import { Optional } from "@/optional.js";
import { BandersnatchCodec, HashCodec } from "@/identity.js";
import assert from "node:assert";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
const opthashcodec = new Optional(HashCodec);

const epochMarkerCodec: JamCodec<NonNullable<JamHeader["epochMarker"]>> = {
  decode(bytes: Uint8Array): {
    value: NonNullable<JamHeader["epochMarker"]>;
    readBytes: number;
  } {
    // todo: i did not understand how many validator keys are there
    const numValidators = 60;
    const entropy = LittleEndian.decode(bytes.subarray(0, 4));
    const validatorKeys: Uint8Array[] = [];
    for (let i = 0; i < numValidators; i++) {
      validatorKeys.push(bytes.subarray(4 + i * 32, 4 + (i + 1) * 32));
    }
    return {
      value: {
        entropy: entropy.value,
        validatorKeys,
      },
      readBytes: 4 + numValidators * 32,
    };
  },
  encode(
    value: NonNullable<JamHeader["epochMarker"]>,
    bytes: Uint8Array,
  ): number {
    // todo: i did not understand how many validator keys are there
    const numValidators = 60;
    assert.ok(value.validatorKeys.length === numValidators);
    let offset = 0;
    offset += LittleEndian.encode(
      BigInt(value.entropy),
      bytes.subarray(offset, offset + 4),
    );

    offset += value.validatorKeys.reduce((acc, key) => {
      bytes.set(key, acc);
      return acc + 32;
    }, offset);
    return offset;
  },
  encodedSize(value: Required<JamHeader["epochMarker"]>): number {
    // todo: i did not understand how many validator keys are there
    const numValidators = 60;
    return 4 + numValidators * 32;
  },
};
const optHeCodec = new Optional(epochMarkerCodec);
const judgementMarkerCodec = createArrayLengthDiscriminator(BandersnatchCodec);
export const UnsignedHeaderCodec: JamCodec<JamHeader> = {
  decode(bytes: Uint8Array): { value: JamHeader; readBytes: number } {
    let offset = 0;
    const previousHash = HashCodec.decode(bytes.subarray(offset, offset + 32));
    offset += previousHash.readBytes;
    const priorStateRoot = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    );
    offset += priorStateRoot.readBytes;

    const extrinsicHash = HashCodec.decode(bytes.subarray(offset, offset + 32));
    offset += extrinsicHash.readBytes;

    const timeSlotIndex = LittleEndian.decode(
      bytes.subarray(offset, offset + 4),
    );
    offset += timeSlotIndex.readBytes;

    const epochMarker = optHeCodec.decode(bytes.subarray(offset));
    offset += epochMarker.readBytes;

    const winningTicket = opthashcodec.decode(bytes.subarray(offset));
    offset += winningTicket.readBytes;

    const judgementMarker = judgementMarkerCodec.decode(bytes.subarray(offset));
    offset += judgementMarker.readBytes;

    const blockAuthorKey = LittleEndian.decode(
      bytes.subarray(offset, offset + 2),
    );
    offset += blockAuthorKey.readBytes;

    const entropySignature = BandersnatchCodec.decode(
      bytes.subarray(offset, offset + 32),
    );
    offset += entropySignature.readBytes;
    return {
      value: {
        previousHash: previousHash.value,
        priorStateRoot: priorStateRoot.value,
        extrinsicHash: extrinsicHash.value,
        timeSlotIndex: Number(timeSlotIndex.value),
        epochMarker: epochMarker.value,
        winningTicket: winningTicket.value,
        judgementsMarkers: judgementMarker.value,
        blockAuthorKey: Number(blockAuthorKey.value),
        entropySignature: entropySignature.value,
      },
      readBytes: offset + 32,
    };
  }

  encode(value: JamHeader, bytes: Uint8Array): number {
    let offset = 0;
    offset += HashCodec.encode(
      value.previousHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.priorStateRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.extrinsicHash,
      bytes.subarray(offset, offset + 32),
    );

    offset += LittleEndian.encode(
      BigInt(value.timeSlotIndex),
      bytes.subarray(offset, offset + 4),
    );

    // He
    offset += optHeCodec.encode(value.epochMarker, bytes.subarray(offset));

    // Hw
    offset += opthashcodec.encode(value.winningTicket, bytes.subarray(offset));

    // Hj

    offset += judgementMarkerCodec.encode(
      value.judgementsMarkers,
      bytes.subarray(offset),
    );

    // Hk
    offset += LittleEndian.encode(
      BigInt(value.blockAuthorKey),
      bytes.subarray(offset, offset + 2),
    );

    offset += BandersnatchCodec.encode(
      value.entropySignature,
      bytes.subarray(offset, offset + 32),
    );

    return offset;
  }

  encodedSize(value: JamHeader): number {
    return (
      HashCodec.encodedSize(value.previousHash) +
      HashCodec.encodedSize(value.priorStateRoot) +
      HashCodec.encodedSize(value.extrinsicHash) +
      4 + // timeSlotIndex
      optHeCodec.encodedSize(value.epochMarker) +
      opthashcodec.encodedSize(value.winningTicket) +
      judgementMarkerCodec.encodedSize(value.judgementsMarkers) +
      2 + // blockAuthorKey
      BandersnatchCodec.encodedSize(value.entropySignature)
    );
  }
}
