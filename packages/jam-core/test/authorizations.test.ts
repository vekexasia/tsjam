import { describe, it, vi, expect } from "vitest";

import { verifyEA } from "@/verifySeal";
import {
  E_sub_int,
  HashCodec,
  JamCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  codec_Ea,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  Optional,
  AuthorizerPoolCodec,
  AuthorizerQueueCodec,
  Blake2bHashCodec,
} from "@tsjam/codec";
import {
  Hash,
  Tau,
  Posterior,
  EA_Extrinsic,
  WorkReport,
  RHO,
  ValidatorData,
  JamState,
  Dagger,
  Validated,
  AuthorizerPool,
  AuthorizerQueue,
  CoreIndex,
  Blake2bHash,
  EG_Extrinsic,
} from "@tsjam/types";
import fs from "node:fs";
import { mapCodec } from "@tsjam/codec";
import { beforeEach } from "vitest";
import { TestOutputCodec } from "@tsjam/codec/test/utils.js";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  authorizerPool_toPosterior,
  RHO2DoubleDagger,
} from "@tsjam/transitions";
import { bigintToBytes, toPosterior } from "@tsjam/utils";
import { dot } from "node:test/reporters";

const mocks = vi.hoisted(() => {
  return {
    CORES: 341,
    NUMBER_OF_VALIDATORS: 1023,
  };
});

vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return mocks.NUMBER_OF_VALIDATORS;
    },
  });
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  return toRet;
});

export const getCodecFixtureFile = (
  filename: string,
  kind: "tiny" | "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/authorizations/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};
type TestState = { authPool: AuthorizerPool; authQueue: AuthorizerQueue };
type Input = {
  slot: Posterior<Tau>;
  eg: EG_Extrinsic;
};

describe("authorizations", () => {
  const doTest = (filename: string, kind: "tiny" | "full") => {
    const stateCodec = createCodec<TestState>([
      ["authPool", AuthorizerPoolCodec()],
      ["authQueue", AuthorizerQueueCodec()],
    ]);

    const newTestCodec = createCodec<{
      input: Input;
      preState: TestState;
      postState: TestState;
    }>([
      [
        "input",
        createCodec<Input>([
          ["slot", E_sub_int<Posterior<Tau>>(4)],
          [
            "eg",
            mapCodec(
              createArrayLengthDiscriminator<
                Array<{ core: CoreIndex; authHash: Blake2bHash }>
              >(
                createCodec([
                  ["core", E_sub_int<CoreIndex>(2)],
                  ["authHash", Blake2bHashCodec],
                ]),
              ),
              (a): EG_Extrinsic => {
                return a.map((x) => {
                  return {
                    workReport: {
                      coreIndex: x.core,
                      authorizerHash: x.authHash,
                    },
                  } as unknown as EG_Extrinsic[0];
                }) as EG_Extrinsic;
              },
              (x) => {
                return null as unknown as any;
              },
            ),
          ],
        ]),
      ],
      ["preState", stateCodec],
      ["postState", stateCodec],
    ]);

    const testBin = fs.readFileSync(
      `${__dirname}/../../../jamtestvectors/authorizations/${kind}/${filename}.bin`,
    );

    const { value } = newTestCodec.decode(testBin);
    const [, p_pool] = authorizerPool_toPosterior(
      {
        eg: value.input.eg,
        p_tau: value.input.slot,
        p_queue: toPosterior(value.preState.authQueue),
      },
      value.preState.authPool,
    ).safeRet();
    expect(value.preState.authQueue, "authQueue is invariant").deep.eq(
      value.postState.authQueue,
    );
    expect(
      p_pool.map((c) =>
        c.map((h) => Buffer.from(bigintToBytes(h, 32)).toString("hex")),
      ),
    ).deep.eq(
      value.postState.authPool.map((c) =>
        c.map((h) => Buffer.from(bigintToBytes(h, 32)).toString("hex")),
      ),
    );
  };
  const set = "tiny" as "tiny" | "full";
  beforeEach(() => {
    if (set === "tiny") {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
    }
  });
  it("progress_authorizations-1", () => {
    doTest("progress_authorizations-1", set);
  });
  it("progress_authorizations-2", () => {
    doTest("progress_authorizations-2", set);
  });
  it("progress_authorizations-3", () => {
    doTest("progress_authorizations-3", set);
  });
});
