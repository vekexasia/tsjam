/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import merklization from "@tsjam/merklization";
import * as fs from "node:fs";
import { dummyState } from "./utils.js";
import { ok } from "neverthrow";
import {
  BandersnatchKey,
  DisputeExtrinsic,
  ED25519PublicKey,
  EA_Extrinsic,
  EG_Extrinsic,
  JamState,
  OpaqueHash,
  SafroleState,
  Tau,
  TicketExtrinsics,
  TicketIdentifier,
  SeqOfLength,
  ValidatorIndex,
  BandersnatchSignature,
  ValidatorData,
  JamBlock,
  JamHeader,
  SignedJamHeader,
} from "@tsjam/types";
import { bigintToBytes, isFallbackMode, toTagged } from "@tsjam/utils";
import { computeHeaderHash, importBlock } from "@/importBlock.js";
import { merkelizeState } from "@tsjam/merklization";
import {
  BandersnatchCodec,
  Blake2bHashCodec,
  codec_Et,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub_int,
  eitherOneOfCodec,
  JamCodec,
  OpaqueHashCodec,
  TicketIdentifierCodec,
  ValidatorDataCodec,
  BandersnatchRingRootCodec,
  Optional,
  mapCodec,
  Ed25519PubkeyCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { logCodec } from "@tsjam/codec/test/utils.js";

const mocks = vi.hoisted(() => {
  return {
    LOTTERY_MAX_SLOT: 500,
    MAX_TICKETS_PER_BLOCK: 16,
    NUMBER_OF_VALIDATORS: 1023,
    EPOCH_LENGTH: 600,
    CORES: 341,
    MAX_TICKETS_PER_VALIDATOR: 2,
    psi_o: new Set<ED25519PublicKey>(),
    toTagged: (a: any) => a,
    vrfOutputSignature: (a: any) => {
      return a;
    },
  };
});
vi.mock("@tsjam/transitions", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@tsjam/transitions")>();
  const toRet = {
    ...orig,
  };
  Object.defineProperty(toRet, "disputesSTF", {
    get() {
      return () => {
        return {
          safeRet() {
            return [
              undefined,
              {
                psi_g: new Set(),
                psi_b: new Set(),
                psi_w: new Set(),
                psi_o: mocks.psi_o,
              },
            ];
          },
        };
      };
    },
  });
  return toRet;
});
vi.mock("@/verifySeal", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/verifySeal")>();

  const toRet = {
    ...orig,
  };
  Object.defineProperty(toRet, "verifySeal", {
    get() {
      return () => true;
    },
  });
  Object.defineProperty(toRet, "verifyEntropySignature", {
    get() {
      return () => true;
    },
  });
  Object.defineProperty(toRet, "verifyEpochMarker", {
    get() {
      return () => ok(undefined);
    },
  });

  Object.defineProperty(toRet, "verifyWinningTickets", {
    get() {
      return () => ok(undefined);
    },
  });

  Object.defineProperty(toRet, "verifyExtrinsicHash", {
    get() {
      return () => true;
    },
  });
  return toRet;
});
vi.mock("@tsjam/crypto", async (importOriginal) => {
  const origCrytpo = await importOriginal<typeof import("@tsjam/crypto")>();
  const toRet = {
    ...origCrytpo,
  };
  Object.defineProperty(toRet.Bandersnatch, "vrfOutputSignature", {
    get() {
      return mocks.vrfOutputSignature;
    },
  });
  return toRet;
});
vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  Object.defineProperty(toRet, "LOTTERY_MAX_SLOT", {
    get() {
      return mocks.LOTTERY_MAX_SLOT;
    },
  });
  Object.defineProperty(toRet, "MAX_TICKETS_PER_BLOCK", {
    get() {
      return mocks.MAX_TICKETS_PER_BLOCK;
    },
  });
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return mocks.NUMBER_OF_VALIDATORS;
    },
  });
  Object.defineProperty(toRet, "EPOCH_LENGTH", {
    get() {
      return mocks.EPOCH_LENGTH;
    },
  });
  Object.defineProperty(toRet, "MAX_TICKETS_PER_VALIDATOR", {
    get() {
      return mocks.MAX_TICKETS_PER_VALIDATOR;
    },
  });

  return toRet;
});
type TestState = {
  tau: Tau;
  entropy: JamState["entropy"];
  lambda: JamState["lambda"];
  kappa: JamState["kappa"];
  gamma_k: SafroleState["gamma_k"];
  iota: JamState["iota"];
  gamma_a: SafroleState["gamma_a"];
  gamma_s: {
    tickets?: SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">;
    keys?: SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;
  };
  gamma_z: SafroleState["gamma_z"];
  p_psi_o: ED25519PublicKey[];
};
type EpochMark = {
  entropy: OpaqueHash;
  ticketsEntropy: OpaqueHash;
  validators: { bandersnatch: BandersnatchKey; ed25519: ED25519PublicKey }[]; // validator long
};
type TestType = {
  input: {
    curSlot: Tau;
    entropy: OpaqueHash; // Y(Hv)
    et: TicketExtrinsics;
  };
  preState: JamState;
  output: {
    error?: number;
    ok?: {
      epochMark?: EpochMark;
      ticketsMark?: TicketIdentifier[]; // epoch long
    };
  };
  postState: JamState;
};

const buildTest = (name: string, size: "tiny" | "full") => {
  const NUMVALS = (size === "tiny"
    ? 6
    : 1023) as unknown as typeof NUMBER_OF_VALIDATORS;
  const EPLEN = (size === "tiny" ? 12 : 600) as unknown as typeof EPOCH_LENGTH;
  const NCOR = (size === "tiny" ? 2 : 341) as unknown as number;
  const stateCodec = createCodec<TestState>([
    ["tau", E_sub_int<Tau>(4)],
    [
      "entropy",
      createSequenceCodec(4, Blake2bHashCodec) as unknown as JamCodec<
        JamState["entropy"]
      >,
    ],
    [
      "lambda",
      createSequenceCodec<JamState["lambda"]>(NUMVALS, ValidatorDataCodec),
    ],
    [
      "kappa",
      createSequenceCodec<JamState["kappa"]>(NUMVALS, ValidatorDataCodec),
    ],
    [
      "gamma_k",
      createSequenceCodec<SafroleState["gamma_k"]>(NUMVALS, ValidatorDataCodec),
    ],
    [
      "iota",
      createSequenceCodec<JamState["iota"]>(NUMVALS, ValidatorDataCodec),
    ],
    [
      "gamma_a",
      createArrayLengthDiscriminator<SafroleState["gamma_a"]>(
        TicketIdentifierCodec,
      ),
    ],
    [
      "gamma_s",
      eitherOneOfCodec<TestState["gamma_s"]>([
        [
          "tickets",
          createSequenceCodec<
            SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">
          >(EPLEN, TicketIdentifierCodec),
        ],
        [
          "keys",
          createSequenceCodec<
            SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">
          >(EPLEN, BandersnatchCodec),
        ],
      ]),
    ],
    [
      "gamma_z",
      BandersnatchRingRootCodec as unknown as JamCodec<SafroleState["gamma_z"]>,
    ],
    [
      "p_psi_o",
      createArrayLengthDiscriminator<ED25519PublicKey[]>(Ed25519PubkeyCodec),
    ],
  ]);

  const jamStateCodec = mapCodec<TestState, JamState>(
    stateCodec,
    (fromTest: TestState): JamState => {
      // this is so hacky i want to cry
      mocks.psi_o = new Set(fromTest.p_psi_o);
      return {
        ...dummyState({ validators: NUMVALS, cores: NCOR, epoch: EPLEN }),
        kappa: fromTest.kappa,
        iota: fromTest.iota,
        tau: fromTest.tau,
        lambda: fromTest.lambda,
        entropy: fromTest.entropy,
        safroleState: {
          gamma_a: fromTest.gamma_a,
          gamma_k: fromTest.gamma_k,
          gamma_z: fromTest.gamma_z,
          gamma_s: ((): SafroleState["gamma_s"] => {
            if (typeof fromTest.gamma_s.tickets !== "undefined") {
              return fromTest.gamma_s.tickets!;
            }
            return fromTest.gamma_s.keys!;
          })() as SafroleState["gamma_s"],
        },
      };
    },
    (fromJam: JamState) => {
      return {
        kappa: fromJam.kappa,
        iota: fromJam.iota,
        tau: fromJam.tau,
        lambda: fromJam.lambda,
        entropy: fromJam.entropy,
        p_psi_o: [...fromJam.disputes.psi_o.values()],
        gamma_z: fromJam.safroleState.gamma_z,
        gamma_a: fromJam.safroleState.gamma_a,
        gamma_k: fromJam.safroleState.gamma_k,
        gamma_s: ((gs: SafroleState["gamma_s"]) => {
          if (isFallbackMode(gs)) {
            return {
              keys: gs,
            };
          } else {
            return {
              tickets: gs,
            };
          }
        })(fromJam.safroleState.gamma_s) as TestState["gamma_s"],
      };
    },
  );

  const testCodec = createCodec<TestType>([
    [
      "input",
      createCodec<TestType["input"]>([
        ["curSlot", E_sub_int<Tau>(4)],
        ["entropy", OpaqueHashCodec],
        ["et", codec_Et],
      ]),
    ],
    ["preState", jamStateCodec],
    [
      "output",
      eitherOneOfCodec<TestType["output"]>([
        [
          "ok",
          createCodec<NonNullable<TestType["output"]["ok"]>>([
            [
              "epochMark",
              new Optional(
                createCodec<EpochMark>([
                  ["entropy", OpaqueHashCodec],
                  ["ticketsEntropy", OpaqueHashCodec],
                  [
                    "validators",
                    createSequenceCodec(
                      NUMVALS,
                      createCodec<EpochMark["validators"][0]>([
                        ["bandersnatch", BandersnatchCodec],
                        ["ed25519", Ed25519PubkeyCodec],
                      ]),
                    ) as unknown as JamCodec<EpochMark["validators"]>,
                  ],
                ]),
              ),
            ] as unknown as any,
            [
              "ticketsMark",
              new Optional(createSequenceCodec(EPLEN, TicketIdentifierCodec)),
            ] as unknown as any,
          ]) as unknown as JamCodec<NonNullable<TestType["output"]["ok"]>>,
        ],
        ["error", E_sub_int<number>(1)],
      ]),
    ],
    ["postState", jamStateCodec],
  ]);

  const testBin = fs.readFileSync(
    `${__dirname}/../../../jamtestvectors/safrole/${size}/${name}.bin`,
  );

  const decoded = testCodec.decode(testBin);
  //  console.log(decoded.value.preState)
  const parentHeader: SignedJamHeader = {
    parent: toTagged(1n),
    blockSeal: toTagged(0n),
    offenders: [],
    extrinsicHash: toTagged(0n),
    timeSlotIndex: decoded.value.preState.tau,
    priorStateRoot: toTagged(merkelizeState(decoded.value.preState)),
    entropySignature: decoded.value.input
      .entropy as unknown as BandersnatchSignature,
    blockAuthorKeyIndex: 0 as ValidatorIndex,
  };

  const [err, x] = importBlock(
    {
      header: {
        parent: computeHeaderHash(parentHeader),
        blockSeal: toTagged(0n),
        offenders: [],
        extrinsicHash: toTagged(0n),
        timeSlotIndex: decoded.value.input.curSlot,
        priorStateRoot: toTagged(merkelizeState(decoded.value.preState)),
        entropySignature: decoded.value.input
          .entropy as unknown as BandersnatchSignature,
        blockAuthorKeyIndex: 0 as ValidatorIndex,
      },
      extrinsics: {
        tickets: decoded.value.input.et,
        disputes: {
          verdicts: [],
          culprit: [],
          faults: [],
        } as unknown as DisputeExtrinsic,
        preimages: [],
        assurances: [] as unknown as EA_Extrinsic,
        reportGuarantees: [] as unknown as EG_Extrinsic,
      },
    },
    {
      state: decoded.value.preState,
      block: { header: parentHeader } as JamBlock,
    },
  ).safeRet();
  if (err) {
    throw new Error(err);
  }
  const newState = x!.state;

  const edonly = (vd: ValidatorData) =>
    Buffer.from(bigintToBytes(vd.ed25519, 32)).toString("hex");
  const tohex = (n: number) => (a: bigint) =>
    Buffer.from(bigintToBytes(<any>a, n)).toString("hex");
  expect(newState.safroleState.gamma_a, "gamma_a").deep.eq(
    decoded.value.postState.safroleState.gamma_a,
  );
  expect(newState.safroleState.gamma_k.map(edonly), "gamma_k").deep.eq(
    decoded.value.postState.safroleState.gamma_k.map(edonly),
  );
  expect(newState.safroleState.gamma_s, "gamma_s").deep.eq(
    decoded.value.postState.safroleState.gamma_s,
  );
  expect(tohex(144)(newState.safroleState.gamma_z), "gamma_z").deep.eq(
    tohex(144)(decoded.value.postState.safroleState.gamma_z),
  );
  expect(newState.safroleState, "safrole").deep.eq(
    decoded.value.postState.safroleState,
  );
  expect(newState.kappa).deep.eq(decoded.value.postState.kappa);
  expect(newState.iota).deep.eq(decoded.value.postState.iota);
  expect(newState.lambda).deep.eq(decoded.value.postState.lambda);
  expect(newState.tau).deep.eq(decoded.value.postState.tau);
  expect(newState.entropy).deep.eq(decoded.value.postState.entropy);
};
describe("safrole-test-vectors", () => {
  describe("full", () => {
    const test = (name: string) => buildTest(name, "full");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 500;
      mocks.EPOCH_LENGTH = 600;
      mocks.NUMBER_OF_VALIDATORS = 1023;
      mocks.MAX_TICKETS_PER_VALIDATOR = 2;
      mocks.CORES = 341;
    });
    it("enact-epoch-change-with-no-tickets-1", () =>
      test("enact-epoch-change-with-no-tickets-1"));
    it("enact-epoch-change-with-no-tickets-2", () =>
      expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
        "Invalid slot",
      ));
    it("enact-epoch-change-with-no-tickets-3", () =>
      test("enact-epoch-change-with-no-tickets-3"));
    it("enact-epoch-change-with-no-tickets-4", () =>
      test("enact-epoch-change-with-no-tickets-4"));
    it("skip-epoch-tail-1", () => test("skip-epoch-tail-1"));
    it("skip-epochs-1", () => test("skip-epochs-1"));
    it("publish-tickets-no-mark-1", () =>
      expect(() => test("publish-tickets-no-mark-1")).toThrow(
        "Entry index must be 0<=x<N",
      ));
    it("publish-tickets-no-mark-2", () => test("publish-tickets-no-mark-2"));
    it("publish-tickets-no-mark-3", () =>
      expect(() => test("publish-tickets-no-mark-3")).toThrow(
        "Ticket id already in gamma_a",
      ));
    it("publish-tickets-no-mark-4", () =>
      expect(() => test("publish-tickets-no-mark-4")).toThrow(
        "VRF outputs must be in ascending order and not duplicate",
      ));
    it("publish-tickets-no-mark-5", () =>
      expect(() => test("publish-tickets-no-mark-5")).toThrow(
        "Invalid VRF proof",
      ));
    it("publish-tickets-no-mark-6", () => test("publish-tickets-no-mark-6"));
    it("publish-tickets-no-mark-7", () =>
      expect(() => test("publish-tickets-no-mark-7")).toThrow(
        "Lottery has ended",
      ));
    it("publish-tickets-no-mark-8", () => test("publish-tickets-no-mark-8"));
    it("publish-tickets-no-mark-9", () => test("publish-tickets-no-mark-9"));
    it("publish-tickets-with-mark-1", () =>
      test("publish-tickets-with-mark-1"));
    it("publish-tickets-with-mark-2", () =>
      test("publish-tickets-with-mark-2"));
    it("publish-tickets-with-mark-3", () =>
      test("publish-tickets-with-mark-3"));
    it("publish-tickets-with-mark-4", () =>
      test("publish-tickets-with-mark-4"));
    it("publish-tickets-with-mark-5", () =>
      test("publish-tickets-with-mark-5"));
    it("enact-epoch-change-with-padding-1", () =>
      test("enact-epoch-change-with-padding-1"));
  });
  describe("tiny", () => {
    const test = (name: string) => buildTest(name, "tiny");
    beforeEach(() => {
      mocks.MAX_TICKETS_PER_BLOCK = 16;
      mocks.LOTTERY_MAX_SLOT = 10;
      mocks.EPOCH_LENGTH = 12;
      mocks.NUMBER_OF_VALIDATORS = 6;
      mocks.MAX_TICKETS_PER_VALIDATOR = 3;
      mocks.CORES = 2;
    });
    it("enact-epoch-change-with-no-tickets-1", () =>
      test("enact-epoch-change-with-no-tickets-1"));
    it("enact-epoch-change-with-no-tickets-2", () =>
      expect(() => test("enact-epoch-change-with-no-tickets-2")).toThrow(
        "Invalid slot",
      ));

    it("enact-epoch-change-with-no-tickets-3", () =>
      test("enact-epoch-change-with-no-tickets-3"));
    it("enact-epoch-change-with-no-tickets-4", () =>
      test("enact-epoch-change-with-no-tickets-4"));
    it("skip-epoch-tail-1", () => test("skip-epoch-tail-1"));
    it("skip-epochs-1", () => test("skip-epochs-1"));
    it("publish-tickets-no-mark-1", () =>
      expect(() => test("publish-tickets-no-mark-1")).toThrow(
        "Entry index must be 0<=x<N",
      ));
    it("publish-tickets-no-mark-2", () => test("publish-tickets-no-mark-2"));
    it("publish-tickets-no-mark-3", () =>
      expect(() => test("publish-tickets-no-mark-3")).toThrow(
        "Ticket id already in gamma_a",
      ));
    it("publish-tickets-no-mark-4", () =>
      expect(() => test("publish-tickets-no-mark-4")).toThrow(
        "VRF outputs must be in ascending order and not duplicate",
      ));
    it("publish-tickets-no-mark-5", () =>
      expect(() => test("publish-tickets-no-mark-5")).toThrow(
        "Invalid VRF proof",
      ));
    it("publish-tickets-no-mark-6", () => test("publish-tickets-no-mark-6"));
    it("publish-tickets-no-mark-7", () =>
      expect(() => test("publish-tickets-no-mark-7")).toThrow(
        "Lottery has ended",
      ));
    it("publish-tickets-no-mark-8", () => test("publish-tickets-no-mark-8"));
    it("publish-tickets-no-mark-9", () => test("publish-tickets-no-mark-9"));
    it("publish-tickets-with-mark-1", () =>
      test("publish-tickets-with-mark-1"));
    it("publish-tickets-with-mark-2", () =>
      test("publish-tickets-with-mark-2"));
    it("publish-tickets-with-mark-3", () =>
      test("publish-tickets-with-mark-3"));
    it("publish-tickets-with-mark-4", () =>
      test("publish-tickets-with-mark-4"));
    it("publish-tickets-with-mark-5", () =>
      test("publish-tickets-with-mark-5"));
    it("enact-epoch-change-with-padding-1", () =>
      test("enact-epoch-change-with-padding-1"));
  });
});
