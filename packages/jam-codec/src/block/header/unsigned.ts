import { JamCodec } from "@/codec.js";
import {
  EPOCH_LENGTH,
  JamHeader,
  NUMBER_OF_VALIDATORS,
  TicketIdentifier,
  toTagged,
  u32,
} from "@vekexasia/jam-types";
import { Optional } from "@/optional.js";
import {
  BandersnatchCodec,
  BandersnatchSignatureCodec,
  HashCodec,
  MerkleTreeRootCodec,
} from "@/identity.js";
import assert from "node:assert";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";
import { TicketIdentifierCodec } from "@/ticketIdentifierCodec.js";
import { createSequenceCodec } from "@/sequenceCodec.js";
import { E_2, E_4 } from "@/ints/E_subscr.js";

const epochMarkerCodec: JamCodec<NonNullable<JamHeader["epochMarker"]>> = {
  decode(bytes: Uint8Array): {
    value: NonNullable<JamHeader["epochMarker"]>;
    readBytes: number;
  } {
    const numValidators = NUMBER_OF_VALIDATORS;
    const entropy = E_4.decode(bytes.subarray(0, 4));
    const validatorKeys = [] as unknown as NonNullable<
      JamHeader["epochMarker"]
    >["validatorKeys"];
    for (let i = 0; i < numValidators; i++) {
      validatorKeys.push(
        BandersnatchCodec.decode(bytes.subarray(4 + i * 32, 4 + (i + 1) * 32))
          .value,
      );
    }
    return {
      value: {
        entropy: Number(entropy.value) as u32,
        validatorKeys,
      },
      readBytes: 4 + numValidators * 32,
    };
  },
  encode(
    value: NonNullable<JamHeader["epochMarker"]>,
    bytes: Uint8Array,
  ): number {
    assert.ok(value.validatorKeys.length === NUMBER_OF_VALIDATORS);
    let offset = 0;
    offset += E_4.encode(
      BigInt(value.entropy),
      bytes.subarray(offset, offset + 4),
    );

    offset += value.validatorKeys.reduce((acc, key) => {
      BandersnatchCodec.encode(key, bytes.subarray(acc, acc + 32));
      return acc + 32;
    }, offset);
    return offset;
  },
  encodedSize(): number {
    return 4 + NUMBER_OF_VALIDATORS * 32;
  },
};
const optHeCodec = new Optional(epochMarkerCodec);
const judgementMarkerCodec = createArrayLengthDiscriminator(HashCodec);
const winningTicketsCodec = new Optional(
  createSequenceCodec<TicketIdentifier, typeof EPOCH_LENGTH>(
    EPOCH_LENGTH,
    TicketIdentifierCodec,
  ),
);
export const UnsignedHeaderCodec: JamCodec<JamHeader> = {
  decode(bytes: Uint8Array): { value: JamHeader; readBytes: number } {
    let offset = 0;
    const previousHash = HashCodec.decode(bytes.subarray(offset, offset + 32));
    offset += previousHash.readBytes;
    const priorStateRoot = MerkleTreeRootCodec.decode(
      bytes.subarray(offset, offset + 32),
    );
    offset += priorStateRoot.readBytes;

    const extrinsicHash = HashCodec.decode(bytes.subarray(offset, offset + 32));
    offset += extrinsicHash.readBytes;

    const timeSlotIndex = E_4.decode(bytes.subarray(offset, offset + 4));
    offset += timeSlotIndex.readBytes;

    const epochMarker = optHeCodec.decode(bytes.subarray(offset));
    offset += epochMarker.readBytes;

    const winningTickets = winningTicketsCodec.decode(bytes.subarray(offset));
    offset += winningTickets.readBytes;

    const judgementMarker = judgementMarkerCodec.decode(bytes.subarray(offset));
    offset += judgementMarker.readBytes;

    const blockAuthorKey = E_2.decode(bytes.subarray(offset, offset + 2));
    offset += blockAuthorKey.readBytes;

    const entropySignature = BandersnatchSignatureCodec.decode(
      bytes.subarray(offset, offset + 64),
    );
    offset += entropySignature.readBytes;
    return {
      value: {
        previousHash: previousHash.value,
        priorStateRoot: priorStateRoot.value,
        extrinsicHash: extrinsicHash.value,
        timeSlotIndex: toTagged(Number(timeSlotIndex.value)),
        epochMarker: epochMarker.value,
        winningTickets: winningTickets.value, // FIXME
        judgementsMarkers: judgementMarker.value,
        blockAuthorKeyIndex: toTagged(Number(blockAuthorKey.value)),
        entropySignature: entropySignature.value,
      },
      readBytes: offset + 32,
    };
  },

  encode(value: JamHeader, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      `UnsignedHeaderCodec: not enough space in buffer when encoding, expected ${this.encodedSize(value)}, got ${bytes.length}`,
    );
    let offset = 0;
    offset += HashCodec.encode(
      value.previousHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += MerkleTreeRootCodec.encode(
      value.priorStateRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.extrinsicHash,
      bytes.subarray(offset, offset + 32),
    );

    offset += E_4.encode(
      BigInt(value.timeSlotIndex),
      bytes.subarray(offset, offset + 4),
    );

    // He
    offset += optHeCodec.encode(value.epochMarker, bytes.subarray(offset));

    // Hw
    offset += winningTicketsCodec.encode(
      value.winningTickets,
      bytes.subarray(offset),
    );

    // Hj

    offset += judgementMarkerCodec.encode(
      value.judgementsMarkers,
      bytes.subarray(offset),
    );

    // Hk
    offset += E_2.encode(
      BigInt(value.blockAuthorKeyIndex),
      bytes.subarray(offset, offset + 2),
    );

    offset += BandersnatchSignatureCodec.encode(
      value.entropySignature,
      bytes.subarray(offset, offset + 64),
    );

    return offset;
  },

  encodedSize(value: JamHeader): number {
    return (
      HashCodec.encodedSize(value.previousHash) +
      MerkleTreeRootCodec.encodedSize(value.priorStateRoot) +
      HashCodec.encodedSize(value.extrinsicHash) +
      4 + // timeSlotIndex
      optHeCodec.encodedSize(value.epochMarker) +
      winningTicketsCodec.encodedSize(value.winningTickets) +
      judgementMarkerCodec.encodedSize(value.judgementsMarkers) +
      2 + // blockAuthorKey
      BandersnatchSignatureCodec.encodedSize(value.entropySignature)
    );
  },
};
