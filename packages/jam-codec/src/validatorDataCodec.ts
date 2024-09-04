import { JamCodec } from "@/codec";
import {
  BLSKey,
  ByteArrayOfLength,
  type ValidatorData,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { BandersnatchCodec, Ed25519PubkeyCodec } from "@/identity.js";
import { bigintToBytes } from "@vekexasia/jam-utils";

export const ValidatorDataCodec: JamCodec<ValidatorData> = {
  encode: function (value: ValidatorData, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      "Buffer for validator data is too small",
    );
    let offset = 0;
    //todo: change to proper codecs
    bytes.set(bigintToBytes(value.banderSnatch, 32), offset);
    offset += 32;
    bytes.set(bigintToBytes(value.ed25519, 32), offset);
    offset += 32;
    bytes.set(value.blsKey, offset);
    offset += 144;
    bytes.set(value.metadata, offset);
    offset += 128;
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: ValidatorData;
    readBytes: number;
  } {
    assert.ok(bytes.length >= 336, "Buffer is too small");

    const banderSnatch = BandersnatchCodec.decode(bytes.subarray(0, 32)).value;
    const ed25519 = Ed25519PubkeyCodec.decode(bytes.subarray(32, 64)).value;
    const blsKey = bytes.subarray(64, 208) as BLSKey;
    const metadata = bytes.subarray(208, 336) as ByteArrayOfLength<128>;
    const v: ValidatorData = {
      banderSnatch,
      ed25519,
      blsKey,
      metadata,
    };
    return {
      value: v,
      readBytes: 336,
    };
  },
  encodedSize: function (): number {
    return 336;
  },
};
