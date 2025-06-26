import {
  deltaToPosterior,
  DeltaToPosteriorError,
  serviceStatisticsSTF,
} from "@/index.js";
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
  ServiceStatisticsCodec,
} from "@tsjam/codec";
import {
  buildTestDeltaCodec,
  posteriorCodec,
} from "@tsjam/codec/test/testCodecs.js";
import { MerkleServiceAccountStorageImpl } from "@tsjam/merklization";
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";
import {
  Delta,
  DoubleDagger,
  EP_Extrinsic,
  Hash,
  Posterior,
  ServiceAccount,
  ServiceIndex,
  SingleServiceStatistics,
  Tau,
  u32,
} from "@tsjam/types";
import * as fs from "node:fs";
import { describe, expect, it } from "vitest";

type TestState = {
  accounts: DoubleDagger<Delta>;
  statistics: Map<ServiceIndex, SingleServiceStatistics>;
};

type Input = {
  ep: EP_Extrinsic;
  p_tau: Posterior<Tau>;
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
      buildTestDeltaCodec<DoubleDagger<Delta>>((serviceIndex: ServiceIndex) =>
        mapCodec(
          createCodec<{
            preimages: ServiceAccount["preimages"];
            requests: Array<{ hash: Hash; length: u32; tau: Tau[] }>;
          }>([
            ["preimages", buildKeyValueCodec(LengthDiscrimantedIdentity)],
            [
              "requests",
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
            const preimage_l: ServiceAccount["requests"] = new Map();
            info.requests.forEach((entry) => {
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
            const storage = new MerkleServiceAccountStorageImpl(serviceIndex);
            // FIXME: 0.6.7 any should disappear
            const toRet = new ServiceAccountImpl(<any>{
              requests: preimage_l,
              preimages: info.preimages,
              storage,
            });
            return toRet as ServiceAccount;
          },
          (_) => {
            // we dont really care
            return {} as unknown as any;
          },
        ),
      ),
    ],
    ["statistics", ServiceStatisticsCodec],
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

  const [, p_serviseStats] = serviceStatisticsSTF(
    {
      guaranteedReports: [],
      preimages: input.ep,
      accumulationStatistics: new Map(),
      transferStatistics: new Map(),
    },
    preState.statistics,
  ).safeRet();

  expect([...p_serviseStats.entries()]).deep.eq([
    ...postState.statistics.entries(),
  ]);
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
