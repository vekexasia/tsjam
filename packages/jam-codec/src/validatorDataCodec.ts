import { JamCodec } from "@/codec";
import {
  BLSKey,
  ByteArrayOfLength,
  type ValidatorData,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import {
  BandersnatchCodec,
  Ed25519PubkeyCodec,
  IdentityCodec,
} from "@/identity.js";

export const ValidatorDataCodec: JamCodec<ValidatorData> = {
  encode: function (value: ValidatorData, bytes: Uint8Array): number {
    assert.ok(
      bytes.length >= this.encodedSize(value),
      "Buffer for validator data is too small",
    );
    let offset = 0;

    offset += BandersnatchCodec.encode(
      value.banderSnatch,
      bytes.subarray(offset, offset + 32),
    );

    offset += Ed25519PubkeyCodec.encode(
      value.ed25519,
      bytes.subarray(offset, offset + 32),
    );

    offset += IdentityCodec.encode(
      value.blsKey,
      bytes.subarray(offset, offset + 144),
    );

    offset += IdentityCodec.encode(
      value.metadata,
      bytes.subarray(offset, offset + 128),
    );
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
