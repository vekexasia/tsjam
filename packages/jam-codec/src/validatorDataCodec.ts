import { JamCodec } from "@/codec";
import { type ValidatorData } from "@vekexasia/jam-types";
import assert from "node:assert";

export const ValidatorDataCodec: JamCodec<ValidatorData> = {
  encode: function (value: ValidatorData, bytes: Uint8Array): number {
    assert.ok(bytes.length >= this.encodedSize(value), "Buffer is too small");
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
    const banderSnatch: Uint8Array = bytes.slice(0, 32);
    const ed25519 = bytes.slice(32, 64);
    const blsKey = bytes.slice(64, 208);
    const metadata = bytes.slice(208, 336);
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
