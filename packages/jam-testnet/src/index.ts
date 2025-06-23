import {
  E_4_int,
  Ed25519PubkeyBigIntCodec,
  encodeWithCodec,
  SignedHeaderCodec,
  Uint8ArrayJSONCodec,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { importBlock } from "@tsjam/core";
import { Bandersnatch, Ed25519, Hashing } from "@tsjam/crypto";
import {
  BandersnatchKey,
  BandersnatchSignature,
  Blake2bHash,
  ED25519PublicKey,
  Hash,
  HeaderHash,
  JamBlock,
  JamState,
  SignedJamHeader,
  StateRootHash,
  Tau,
  u32,
  ValidatorData,
  ValidatorIndex,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

type Keys = {
  seed: Uint8Array;
  ed25519Secret: Uint8Array;
  bandersnatchSecret: Uint8Array;
  ed25519Public: ED25519PublicKey["buf"];
  bandersnatchPublic: BandersnatchKey;
};
export const generateValidatorKeys = (howMany: number): Keys[] => {
  const keys: Keys[] = [];
  for (let i = 0; i < howMany; i++) {
    const trivialSeed = new Uint8Array([
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
      ...encodeWithCodec(E_4_int, <u32>i),
    ]);

    const ed25519Secret = Hashing.blake2bBuf(
      new Uint8Array([
        ...Buffer.from("jam_val_key_ed25519", "utf8"),
        ...trivialSeed,
      ]),
    );

    const bandersnatchSecret = Hashing.blake2bBuf(
      new Uint8Array([
        ...Buffer.from("jam_val_key_bandersnatch", "utf8"),
        ...trivialSeed,
      ]),
    );

    const pr = Ed25519.privKeyFromSeed(ed25519Secret);

    const bander = Bandersnatch.publicFromSeed(bandersnatchSecret);

    keys.push({
      seed: trivialSeed,
      ed25519Secret,
      ed25519Public: pr.public,
      bandersnatchSecret,
      bandersnatchPublic: bander,
    });
  }

  return keys;
};

export const generateGenesis = (
  numValidators: typeof NUMBER_OF_VALIDATORS = NUMBER_OF_VALIDATORS,
): {genesis: JamBlock; state: JamState} => {
  const keys = generateValidatorKeys(numValidators);

  const genesis: SignedJamHeader = {
    parent: <HeaderHash>0n,
    priorStateRoot: <StateRootHash>0n,
    extrinsicHash: <Hash>0n,
    timeSlotIndex: <Tau>0,
    winningTickets: undefined,
    offenders: [],
    blockAuthorKeyIndex: <ValidatorIndex>0,
    blockSeal: <BandersnatchSignature>new Uint8Array(96).fill(0),
    entropySignature: <BandersnatchSignature>new Uint8Array(96).fill(0),
    epochMarker: {
      entropy: <Blake2bHash>0n,
      entropy2: <Blake2bHash>0n,
      validatorKeys: toTagged(
        keys.map((key) => ({
          bandersnatch: key.bandersnatchPublic,
          ed25519: {
            buf: key.ed25519Public,
            bigint: Ed25519PubkeyBigIntCodec.decode(key.ed25519Public).value,
          },
        })),
      ),
    },
  };
  const validators: ValidatorData[] = genesis.epochMarker!.validatorKeys.map((v)=> {
    return <ValidatorData> {
      banderSnatch: v.bandersnatch,
      ed25519: v.ed25519,
      blsKey: new Uint8Array(144).fill(0) as ValidatorData["blsKey"],
      metadata: new Uint8Array(128).fill(0) as ValidatorData["metadata"],
    }
  })
  return {genesis, state: {
    iota: toTagged(structuredClone(validators)),
    tau: <Tau>0,
    kappa: toTagged(
      structuredClone(validators),
    ),
    lambda: toTagged(
      structuredClone(validators),
    ),
    safroleState: {
      gamma_k: toTagged(
        structuredClone(validators),
      ),
      gamma_s: toTagged(
        structuredClone(validators),
      ),
      gamma_z: <Blake2bHash>0n,
      gamma_a: <Blake2bHash>0n,
    }




}
  };
};

export const genesisState = (genesis: JamBlock) => {

}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("validator and genesis", () => {
    it("should generate unique keys for each validator", () => {
      const keys = generateValidatorKeys(6);
      expect(keys.length).toBe(6);
    });
    it("should generate full genesis", () => {
      const fullGenesis = generateGenesis();
      const hash = Hashing.blake2bBuf(
        encodeWithCodec(SignedHeaderCodec(), fullGenesis),
      );
      expect(Uint8ArrayJSONCodec.toJSON(hash)).toBe(
        "0x57f075e6bb0b8778b59261fa7ec32626464e4d2f444fca4312dfbf94f3584032",
      );
    });
  });
  describe("import genesis", () => {
    it("should import genesis", () => {
      const genesis = generateGenesis();
      const extrinsics: JamBlock["extrinsics"] = {
        tickets: toTagged([]),
        disputes: {
          verdicts: toTagged([]),
          culprit: [],
          faults: [],
        },
        preimages: [],
        assurances: toTagged([]),
        reportGuarantees: toTagged([]),
      };
      const block: JamBlock = { header: genesis, extrinsics };
      importBlock(block).then((importedBlock) => {

    });
  });
}
