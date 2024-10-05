import {
  DisputeExtrinsic,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  ValidatorIndex,
  u32,
} from "@tsjam/types";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { bytesToBigInt } from "@tsjam/utils";
import { JamCodec } from "@/codec.js";
import { E_2, E_4, E_sub } from "@/ints/E_subscr.js";
import { E } from "@/ints/e.js";
import {
  Ed25519PubkeyCodec,
  Ed25519SignatureCodec,
  HashCodec,
} from "@/identity.js";
import { createArrayLengthDiscriminator } from "@/lengthdiscriminated/arrayLengthDiscriminator.js";

const singleJudgementCodec: JamCodec<
  DisputeExtrinsic["verdicts"][0]["judgements"][0]
> = {
  encode(
    value: DisputeExtrinsic["verdicts"][0]["judgements"][0],
    bytes: Uint8Array,
  ): number {
    let offset = E.encode(BigInt(value.validity), bytes);
    offset += E_2.encode(
      BigInt(value.validatorIndex),
      bytes.subarray(offset, offset + 2),
    );
    Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset + 64;
  },
  decode(bytes: Uint8Array) {
    const validity = E.decode(bytes);
    const validatorIndex = E_sub(2).decode(
      bytes.subarray(validity.readBytes, validity.readBytes + 2),
    );
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(validity.readBytes + 2, validity.readBytes + 66),
    );

    return {
      value: {
        validity: Number(validity.value) as 0 | 1,
        validatorIndex: Number(validatorIndex.value) as ValidatorIndex,
        signature: signature.value,
      },
      readBytes: validity.readBytes + 66,
    };
  },
  encodedSize(value: DisputeExtrinsic["verdicts"][0]["judgements"][0]): number {
    return E.encodedSize(BigInt(value.validity)) + 2 + 64;
  },
};
const jCodec = createArrayLengthDiscriminator<DisputeExtrinsic["verdicts"][0]>({
  encode(value: DisputeExtrinsic["verdicts"][0], bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.hash, bytes.subarray(0, 32));

    offset += E_4.encode(
      BigInt(value.epochIndex),
      bytes.subarray(offset, offset + 4),
    );
    for (let i = 0; i < (NUMBER_OF_VALIDATORS * 2) / 3 + 1; i++) {
      offset += singleJudgementCodec.encode(
        value.judgements[i],
        bytes.subarray(offset),
      );
    }

    return offset;
  },
  decode(bytes: Uint8Array): {
    value: DisputeExtrinsic["verdicts"][0];
    readBytes: number;
  } {
    const hash = HashCodec.decode(bytes);
    let offset = hash.readBytes;
    const epochIndex = E_4.decode(bytes.subarray(offset, offset + 4));
    offset += epochIndex.readBytes;
    const judgements = [];
    for (let i = 0; i < (NUMBER_OF_VALIDATORS * 2) / 3 + 1; i++) {
      const judgement = singleJudgementCodec.decode(bytes.subarray(offset));
      judgements.push(judgement.value);
      offset += judgement.readBytes;
    }
    return {
      value: {
        hash: hash.value,
        epochIndex: Number(epochIndex.value) as u32,
        judgements: judgements as DisputeExtrinsic["verdicts"][0]["judgements"],
      },
      readBytes: offset,
    };
  },
  encodedSize(value: DisputeExtrinsic["verdicts"][0]): number {
    return (
      32 +
      E_4.encodedSize(BigInt(value.epochIndex)) +
      singleJudgementCodec.encodedSize(value.judgements[0]) *
        ((NUMBER_OF_VALIDATORS * 2) / 3 + 1)
    );
  },
});

const cCodec = createArrayLengthDiscriminator<DisputeExtrinsic["culprit"][0]>({
  decode(bytes: Uint8Array) {
    const hash: Hash = bytesToBigInt(bytes.subarray(0, 32));
    const ed25519PublicKey: ED25519PublicKey = bytesToBigInt(
      bytes.subarray(32, 64),
    );
    const signature: ED25519Signature = bytesToBigInt(bytes.subarray(64, 128));
    return {
      value: { hash, ed25519PublicKey, signature },
      readBytes: 128,
    };
  },
  encode(value: DisputeExtrinsic["culprit"][0], bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.hash, bytes.subarray(0, 32));
    offset += Ed25519PubkeyCodec.encode(
      value.ed25519PublicKey,
      bytes.subarray(32, 64),
    );
    offset += Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(64, 128),
    );
    return offset;
  },
  encodedSize(): number {
    return 128;
  },
});
const fCodec = createArrayLengthDiscriminator<DisputeExtrinsic["faults"][0]>({
  decode(bytes: Uint8Array) {
    const hash = HashCodec.decode(bytes.subarray(0, 32));
    const validity = E.decode(bytes.subarray(32));
    const ed25519PublicKey = Ed25519PubkeyCodec.decode(
      bytes.subarray(32 + validity.readBytes, 64 + validity.readBytes),
    );
    const signature = Ed25519SignatureCodec.decode(
      bytes.subarray(64 + validity.readBytes, 128 + validity.readBytes),
    );
    return {
      value: {
        hash: hash.value,
        validity: Number(validity.value) as 0 | 1,
        ed25519PublicKey: ed25519PublicKey.value,
        signature: signature.value,
      },
      readBytes: 128 + validity.readBytes,
    };
  },
  encode(value: DisputeExtrinsic["faults"][0], bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.hash, bytes.subarray(0, 32));
    offset += E.encode(BigInt(value.validity), bytes.subarray(offset));
    offset += Ed25519PubkeyCodec.encode(
      value.ed25519PublicKey,
      bytes.subarray(offset, offset + 32),
    );
    offset += Ed25519SignatureCodec.encode(
      value.signature,
      bytes.subarray(offset, offset + 64),
    );
    return offset;
  },
  encodedSize(value: DisputeExtrinsic["faults"][0]): number {
    return 32 + E.encodedSize(BigInt(value.validity)) + 32 + 64;
  },
});
export const codec_Ed: JamCodec<DisputeExtrinsic> = {
  encode(value: DisputeExtrinsic, bytes: Uint8Array): number {
    let offset = jCodec.encode(value.verdicts, bytes);
    offset += cCodec.encode(value.culprit, bytes.subarray(offset));
    offset += fCodec.encode(value.faults, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: DisputeExtrinsic; readBytes: number } {
    const verdicts = jCodec.decode(bytes);
    const culprit = cCodec.decode(bytes.subarray(verdicts.readBytes));
    const faults = fCodec.decode(
      bytes.subarray(verdicts.readBytes + culprit.readBytes),
    );
    return {
      value: {
        verdicts: verdicts.value as DisputeExtrinsic["verdicts"],
        culprit: culprit.value,
        faults: faults.value,
      },
      readBytes: verdicts.readBytes + culprit.readBytes + faults.readBytes,
    };
  },
  encodedSize(value: DisputeExtrinsic): number {
    return (
      jCodec.encodedSize(value.verdicts) +
      cCodec.encodedSize(value.culprit) +
      fCodec.encodedSize(value.faults)
    );
  },
};

if (import.meta.vitest) {
  const { vi, beforeAll, describe, expect, it } = import.meta.vitest;
  const constants = await import("@tsjam/constants");
  const { disputesExtrinsicFromJSON, getUTF8FixtureFile, getCodecFixtureFile } =
    await import("@/test/utils.js");
  describe("codecED", () => {
    beforeAll(() => {
      // @ts-expect-error validators
      vi.spyOn(constants, "NUMBER_OF_VALIDATORS", "get").mockReturnValue(6);
    });

    const bin = getCodecFixtureFile("disputes_extrinsic.bin");
    const json = JSON.parse(getUTF8FixtureFile("disputes_extrinsic.json"));
    it("disputes_extrinsic.json encoded should match disputes_extrinsic.bin", () => {
      const ed: DisputeExtrinsic = disputesExtrinsicFromJSON(json);
      const b = new Uint8Array(bin.length);
      codec_Ed.encode(ed, b);
      expect(codec_Ed.encodedSize(ed)).toBe(bin.length);
      expect(Buffer.from(b).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
      // check decode now
      const x = codec_Ed.decode(b);
      expect(x.value.verdicts).toEqual(ed.verdicts);
      expect(x.value.culprit).toEqual(ed.culprit);
      expect(x.value.faults).toEqual(ed.faults);
    });
  });
}
