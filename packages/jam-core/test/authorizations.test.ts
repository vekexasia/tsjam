import { describe, expect, it, vi } from "vitest";

import {
  BaseJamCodecable,
  Blake2bHashCodec,
  codec,
  createArrayLengthDiscriminator,
  createCodec,
  E_sub_int,
  eSubIntCodec,
  JamCodecable,
  mapCodec,
} from "@tsjam/codec";
import {
  AuthorizerPool,
  AuthorizerQueue,
  Blake2bHash,
  CoreIndex,
  EG_Extrinsic,
  Posterior,
  Tau,
  Validated,
} from "@tsjam/types";
import { bigintToBytes, toPosterior, toTagged } from "@tsjam/utils";
import fs from "node:fs";
import { beforeEach } from "vitest";
import { AuthorizerPoolImpl } from "@/classes/AuthorizerPoolImpl";
import { AuthorizerQueueImpl } from "@/classes/AuthorizerQueueImpl";
import {
  GuaranteesExtrinsicImpl,
  SingleWorkReportGuaranteeImpl,
} from "@/classes/extrinsics/guarantees";
import { WorkReportImpl } from "@/classes/WorkReportImpl";

export const getCodecFixtureFile = (
  filename: string,
  kind: "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/stf/authorizations/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(AuthorizerPoolImpl)
  authPool!: AuthorizerPoolImpl;
  @codec(AuthorizerQueueImpl)
  authQueue!: Posterior<AuthorizerQueueImpl>;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @eSubIntCodec(4)
  slot!: Posterior<Tau>;
  @codec(
    <any>mapCodec(
      createArrayLengthDiscriminator<
        Array<{ core: CoreIndex; authHash: Blake2bHash }>
      >(
        createCodec([
          ["core", E_sub_int<CoreIndex>(2)],
          ["authHash", Blake2bHashCodec],
        ]),
      ),
      (a): GuaranteesExtrinsicImpl => {
        return new GuaranteesExtrinsicImpl(
          toTagged(
            a.map((x) => {
              return new SingleWorkReportGuaranteeImpl({
                report: new WorkReportImpl({
                  core: x.core,
                  authorizerHash: x.authHash,
                }),
              });
            }),
          ),
        );
      },
      (x) => {
        return null as unknown as any;
      },
    ),
  )
  eg!: Validated<GuaranteesExtrinsicImpl>;
}
@JamCodecable()
class Test extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;
  @codec(TestState)
  preState!: TestState;
  @codec(TestState)
  postState!: TestState;
}

describe("authorizations", () => {
  const doTest = (filename: string, kind: "full") => {
    const testBin = fs.readFileSync(
      `${__dirname}/../../../jamtestvectors/stf/authorizations/${kind}/${filename}.bin`,
    );

    const { value } = Test.decode(testBin);
    const p_pool = value.preState.authPool.toPosterior({
      eg: value.input.eg,
      p_tau: value.input.slot,
      p_queue: value.preState.authQueue,
    });
    expect(value.preState.authQueue, "authQueue is invariant").deep.eq(
      value.postState.authQueue,
    );
    expect(p_pool.toJSON()).deep.eq(value.postState.authPool.toJSON());
  };
  const set = "full";
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
