import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { deltaToPosterior, DeltaToPosteriorError } from "@/index.js";
import {
  Delta,
  DoubleDagger,
  EP_Extrinsic,
  Gas,
  Hash,
  Posterior,
  ServiceAccount,
  Tau,
  u32,
  u64,
} from "@tsjam/types";
import {
  buildKeyValueCodec,
  codec_Ep,
  createArrayLengthDiscriminator,
  createCodec,
  E_4_int,
  E_sub_int,
  eitherOneOfCodec,
  HashCodec,
  LengthDiscrimantedIdentity,
  mapCodec,
} from "@tsjam/codec";
import {
  buildTestDeltaCodec,
  posteriorCodec,
} from "@tsjam/codec/test/testCodecs.js";

type TestState = {
  accounts: DoubleDagger<Delta>;
};

type Input = {
  p_tau: Posterior<Tau>;
  ep: EP_Extrinsic;
};

type TestCase = {
  input: Input;
  preState: TestState;
  output: { ok?: {}; err?: number };
  postState: TestState;
};
const buildTest = (filename: string) => {
  const stateCodec = createCodec<TestState>([
    [
      "accounts",
      buildTestDeltaCodec<DoubleDagger<Delta>>(
        mapCodec(
          createCodec<{
            preimage_p: ServiceAccount["preimage_p"];
            preimage_l: Array<{ hash: Hash; length: u32; tau: Tau[] }>;
          }>([
            ["preimage_p", buildKeyValueCodec(LengthDiscrimantedIdentity)],
            [
              "preimage_l",
              createArrayLengthDiscriminator(
                createCodec<{ hash: Hash; length: u32; tau: Tau[] }>([
                  ["hash", HashCodec],
                  ["length", E_4_int],
                  [
                    "tau",
                    createArrayLengthDiscriminator<Tau[], Tau>(
                      E_sub_int<Tau>(4),
                    ),
                  ],
                ]),
              ),
            ],
          ]),
          (info) => {
            const preimage_l: ServiceAccount["preimage_l"] = new Map();
            info.preimage_l.forEach((entry) => {
              preimage_l.set(
                entry.hash,
                preimage_l.get(entry.hash) || new Map(),
              );
              const map = preimage_l.get(entry.hash)!;
              map.set(
                entry.length as unknown as any,
                entry.tau as unknown as any,
              );
            });
            const toRet: ServiceAccount = {
              balance: 0n as u64,
              codeHash: 0n as ServiceAccount["codeHash"],
              minGasAccumulate: 0n as Gas,
              minGasOnTransfer: 0n as Gas,
              storage: new Map(),
              preimage_l: preimage_l,
              preimage_p: info.preimage_p,
            };
            return toRet;
          },
          (_) => {
            // we dont really care
            return {} as unknown as any;
          },
        ),
      ),
    ],
  ]);

  const testBin = fs.readFileSync(
    `${__dirname}/../../../jamtestvectors/preimages/data/${filename}.bin`,
  );

  const decoded = createCodec<TestCase>([
    [
      "input",
      createCodec<Input>([
        ["ep", codec_Ep],
        ["p_tau", posteriorCodec(E_sub_int<Tau>(4))],
      ]),
    ],
    ["preState", stateCodec],
    [
      "output",
      eitherOneOfCodec<TestCase["output"]>([
        ["ok", createCodec<{}>([])],
        ["err", E_sub_int<number>(1)],
      ]),
    ],
    ["postState", stateCodec],
  ]).decode(testBin).value;

  const { input, preState, output, postState } = decoded;

  const [err, p_delta] = deltaToPosterior(
    {
      p_tau: input.p_tau,
      EP_Extrinsic: input.ep,
      delta: preState.accounts,
    },
    preState.accounts,
  ).safeRet();
  if (typeof err !== "undefined") {
    const ourErr = [
      DeltaToPosteriorError.PREIMAGE_PROVIDED_OR_UNSOLICITED,
      DeltaToPosteriorError.PREIMAGES_NOT_SORTED,
    ][output.err!];

    expect(err).toEqual(ourErr);
    return;
  }

  expect([...p_delta.entries()]).deep.eq([...postState.accounts]);
};
describe("preimages-test-vectors", () => {
  describe("tiny", () => {
    const test = (name: string) => buildTest(name);

    it("preimage_needed-1", () => test("preimage_needed-1"));
    it("preimage_needed-2", () => test("preimage_needed-2"));
    it("preimage_not_needed-1", () => test("preimage_not_needed-1"));
    it("preimage_not_needed-2", () => test("preimage_not_needed-2"));
    it("preimages_order_check-1", () => test("preimages_order_check-1"));
    it("preimages_order_check-2", () => test("preimages_order_check-2"));
    it("preimages_order_check-3", () => test("preimages_order_check-3"));
    it("preimages_order_check-4", () => test("preimages_order_check-4"));
  });
});
