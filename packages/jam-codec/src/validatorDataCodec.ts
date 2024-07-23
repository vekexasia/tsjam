import { JamCodec } from "@/codec";
import {BandersnatchKey, BLSKey, ByteArrayOfLength, ED25519PublicKey, type ValidatorData} from "@vekexasia/jam-types";
import assert from "node:assert";

export const ValidatorDataCodec: JamCodec<ValidatorData> = {
  encode: function (value: ValidatorData, bytes: Uint8Array): number {
    assert.ok(bytes.length >= this.encodedSize(value), "Buffer for validator data is too small");
    let offset = 0;
    bytes.set(value.banderSnatch, offset);
    offset += 32;
    bytes.set(value.ed25519, offset);
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
    const banderSnatch = bytes.slice(0, 32) as BandersnatchKey;
    const ed25519 = bytes.slice(32, 64) as ED25519PublicKey;
    const blsKey = bytes.slice(64, 208) as BLSKey;
    const metadata = bytes.slice(208, 336) as ByteArrayOfLength<128>;
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
